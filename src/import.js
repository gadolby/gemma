const fs = require('fs');
const jdb = require('./database');
const vcf = require('bionode-vcf');
const gff = require('bionode-gff');
const csv = require('csv');

let import_vcf = function(filename, cmd) {
    let db = new jdb.Database(cmd.database, function(err) {
        if (err !== null) {
            process.stderr.write(err + '\n');
        }
    });

    process.stdout.write(`Importing VCF file ${filename}... `);
    vcf.read(filename);

    let n = 0;
    vcf.on('data', function(entry) {
        n += 1;

        db.insert_entry(entry, function(err) {
            if (err !== null) {
                vcf.emit('error', err);
            }
        });
    });

    vcf.on('error', function(err) {
        process.stderr.write(err + '\n');
        process.exit(1);
    });

    vcf.on('end', () => process.stdout.write(`done. (${n} entries)\n`));
};

let import_gff = function(filename, cmd) {
    let db = new jdb.Database(cmd.database, function(err) {
        if (err !== null) {
            process.stderr.write(err + '\n');
        }
    });

    process.stdout.write(`Importing features from GFF file ${filename}...`);
    const g = gff.read(filename);

    let n = 0;
    g.on('data', function(entry) {
        n += 1;

        db.insert_gene_feature(entry, function(err) {
            if (err !== null) {
                g.emit('error', err);
            }
        });
    });

    g.on('error', function(err) {
        process.stderr.write(err + '\n');
        process.exit(1);
    });

    g.on('end', () => process.stdout.write(`done. (${n} features)\n`));
};

let import_env = function(filename, cmd) {
    let db = new jdb.Database(cmd.database, function(err) {
        if (err !== null) {
            process.stderr.write(err + '\n');
        }
    });

    fs.readFile(filename, function(err, data) {
        if (err !== null) {
            throw err;
        }
        csv.parse(data, function(err, data) {
            if (err !== null) {
                throw err;
            }

            let sampleid_index = data[0].findIndex(function(value) {
                return value.trim().toLowerCase() == 'sampleid';
            });

            if (sampleid_index === -1) {
                throw new Error('Environmental data does not include SampleIDs');
            }

            let samples = [];
            for (let i = 1; i < data.length; ++i) {
                let sid = data[i][sampleid_index];
                if (sid in samples) {
                    throw new Error(`duplicate SampleID ${sid}`);
                }
                samples[sid] = {};
                for (let j = 0; j < data[i].length; ++j) {
                    if (j != sampleid_index) {
                        samples[sid][data[0][j]] = data[i][j];
                    }
                }
            }

            db.insert_environment(samples, function(err) {
                if (err !== null) {
                    process.stderr.write(err + '\n');
                    process.exit(1);
                }
            });
        });
    });
};

module.exports = {
    vcf: import_vcf,
    gff: import_gff,
    env: import_env
};
