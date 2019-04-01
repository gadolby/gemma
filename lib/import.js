const fs = require('fs-extra');
const jdb = require('./database');
const VCF = require('./vcf');
const gff = require('bionode-gff');
const csv = require('csv');

const importVCF = async function(filename, cmd) {
    const db = await jdb.Database(cmd.database);

    const empty = (await db.isEmpty('variants') && await db.isEmpty('alternates'));

    if (empty || cmd.append) {
        return new Promise(function(resolve, reject) {
            const vcf = VCF();
            vcf.read(filename);

            let n = 0;
            vcf.on('data', async function(entry) {
                vcf.pause();
                n += 1;
                try {
                    await db.insertVariantCall(entry);
                    vcf.resume();
                } catch(err) {
                    vcf.emit('error', err);
                }
            });

            vcf.on('error', (err) => reject(err));

            vcf.on('end', () => resolve(n));
        }).finally(() => db.close());
    } else {
        await db.close();
        throw 'VCF data has already been imported; rerun with --append option to force';
    }
};

const importGFF = async function(filename, cmd) {
    const db = await jdb.Database(cmd.database);

    const empty = await db.isEmpty('genes');
    if (empty) {
        return new Promise(function(resolve, reject) {
            const g = gff.read(filename);

            let n = 0;
            g.on('data', async function(entry) {
                n += 1;
                try {
                    await db.insertGeneFeature(entry);
                } catch(err) {
                    g.emit('error', err);
                }
            });

            g.on('error', (err) => reject(err));

            g.on('end', () => resolve(n));
        }).finally(() => db.close());
    } else {
        await db.close();
        throw 'GFF data has already been imported; the --append option is not supported yet';
    }
};

const parseEnv = function(data) {
    return new Promise(function(resolve, reject) {
        csv.parse(data, function(err, data) {
            if (err !== null) {
                return reject(err);
            }

            const sampleid_index = data[0].findIndex(function(value) {
                return value.trim().toLowerCase() === 'sampleid';
            });

            if (sampleid_index === -1) {
                return reject(new Error('Environmental data does not include SampleIDs'));
            }

            const samples = [];
            for (let i = 1; i < data.length; ++i) {
                const sid = data[i][sampleid_index];
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

const importEnv = async function(filename, cmd) {
    const file = await fs.readFile(filename);
    const samples = await parseEnv(file);
    const db = await jdb.Database(cmd.database);
    const empty = await db.isEmpty('environment');
    if (empty || cmd.append) {
        await db.insertEnvironment(samples).finally(() => db.close());
    } else {
        await db.close();
        throw 'Environment data has already been imported; rerun with --append option to force';
    }
};

module.exports = { vcf: importVCF, gff: importGFF, env: importEnv };
