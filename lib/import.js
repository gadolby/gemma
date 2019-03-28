const fs = require('fs-extra');
const jdb = require('./database');
const VCF = require('./vcf');
const gff = require('bionode-gff');
const csv = require('csv');

let import_vcf = async function(filename, cmd) {
    let db = await jdb.Database(cmd.database);

    return new Promise(function(resolve, reject) {
        const vcf = VCF();
        vcf.read(filename);

        let n = 0;
        vcf.on('data', async function(entry) {
            n += 1;
            await db.insert_entry(entry).catch(err => vcf.emit('error', err));
        });

        vcf.on('error', function(err) {
            reject(err);
        });

        vcf.on('end', () => db.close().then(function() {
            resolve(n);
        }));
    });
};

let import_gff = async function(filename, cmd) {
    let db = await jdb.Database(cmd.database);

    return new Promise(function(resolve, reject) {
        const g = gff.read(filename);

        let n = 0;
        g.on('data', async function(entry) {
            n += 1;
            await db.insert_gene_feature(entry).catch(err => g.emit('error', err));
        });

        g.on('error', function(err) {
            reject(err);
        });

        g.on('end', () => db.close().then(function() {
            resolve(n);
        }));
    });
};

const parseEnv = function(data) {
    return new Promise(function(resolve, reject) {
        csv.parse(data, function(err, data) {
            if (err !== null) {
                return reject(err);
            }

            let sampleid_index = data[0].findIndex(function(value) {
                return value.trim().toLowerCase() === 'sampleid';
            });

            if (sampleid_index === -1) {
                return reject(new Error('Environmental data does not include SampleIDs'));
            }

            let samples = [];
            for (let i = 1; i < data.length; ++i) {
                let sid = data[i][sampleid_index];
                if (sid in samples) {
                    return reject(new Error(`duplicate SampleID ${sid}`));
                }
                samples[sid] = {};
                for (let j = 0; j < data[i].length; ++j) {
                    if (j != sampleid_index) {
                        samples[sid][data[0][j]] = data[i][j];
                    }
                }
            }
            return resolve(samples);
        });
    });
};

let import_env = async function(filename, cmd) {
    let file = await fs.readFile(filename);
    let samples = await parseEnv(file);
    const db = await jdb.Database(cmd.database);
    await db.insert_environment(samples);
    await db.close();
};

module.exports = {
    vcf: import_vcf,
    gff: import_gff,
    env: import_env
};
