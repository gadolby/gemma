// Copyright 2018 Greer Dolby, Douglas G. Moore. All rights reserved.
// Use of this source code is governed by a MIT
// license that can be found in the LICENSE file.
const fs = require('fs');
const jdb = require('./database');
const vcf = require('bionode-vcf');
const csv = require('csv');

var import_vcf = function(filename, cmd) {
    var db = new jdb.Database(cmd.database, function(err) {
        if (err !== null) {
            console.error(err);
        }
    });

    process.stdout.write(`Importing VCF file ${filename}... `);
    vcf.read(filename);

    var n = 0;
    vcf.on('data', function(entry) {
        n += 1;

        db.insert_entry(entry, function(err) {
            if (err !== null) {
                vcf.emit('error', err);
            }
        });
    });

    vcf.on('error', function(err) {
        console.error(err);
        process.exit(1);
    });

    vcf.on('end', function(err) {
        process.stdout.write(`done. (${n} entries)`);
    });
};

var import_env = function(filename, cmd) {
    var db = new jdb.Database(cmd.database, function(err) {
        if (err !== null) {
            console.error(err);
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

            samples = [];
            for (var i = 1; i < data.length; ++i) {
                let sid = data[i][sampleid_index];
                if (sid in samples) {
                    throw new Error(`duplicate SampleID ${sid}`);
                }
                samples[sid] = {};
                for (var j = 0; j < data[i].length; ++j) {
                    if (j != sampleid_index) {
                        samples[sid][data[0][j]] = data[i][j];
                    }
                }
            }

            db.insert_environment(samples, function(err) {
                if (err !== null) {
                    console.error(err);
                    process.exit(1);
                }
            });
        });
    });
};

module.exports = {
    vcf: import_vcf,
    env: import_env
};
