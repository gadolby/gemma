// Copyright 2018 Greer Dolby, Douglas G. Moore. All rights reserved.
// Use of this source code is governed by a MIT
// license that can be found in the LICENSE file.
const fs = require('fs');
const jdb = require('./database');
const vcf = require('bionode-vcf');

module.exports = function(filename) {
    if (fs.existsSync('jenna.db')) {
        console.error('The jenna database already exists. Delete it before trying to import again.');
        return;
    }

    var db = new jdb.Database('jenna.db', function(err) {
        if (err !== null) {
            console.error(err);
        }
    });

    console.log(`Importing VCF file ${filename}`);
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

    vcf.on('end', function() {
        console.log(`${filename} has ${n} entries`);
        process.exit(0);
    });

    vcf.on('error', function(err) {
        console.error(err);
    });
};
