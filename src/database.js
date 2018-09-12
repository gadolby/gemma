// Copyright 2018 Greer Dolby, Douglas G. Moore. All rights reserved.
// Use of this source code is governed by a MIT
// license that can be found in the LICENSE file.
const sqlite3 = require('sqlite3').verbose();

module.exports.Database = function(filename = 'jenna.db', callback) {
    var db = new sqlite3.Database(filename, function(err) {
        if (err !== null) {
            callback(err);
        } else {
            this.run('pragma synchronous = OFF', callback);
            this.run('pragma journal_mode = MEMORY', callback);
            this.run('CREATE TABLE IF NOT EXISTS alternates (AlternateID int, Chromosome string, Position Int, Alternate string, SNP int, PRIMARY KEY (AlternateID, Chromosome, Position))', callback);
            this.run('CREATE TABLE IF NOT EXISTS variants (SampleID string, Chromosome string, Position int, ChromosomeCopy int, AlternateID int, PRIMARY KEY (SampleID, Chromosome, Position, ChromosomeCopy))', callback);
            this.run('CREATE TABLE IF NOT EXISTS environment (SampleID string, Name string, Value string, PRIMARY KEY (SampleID, Name))', callback);
        }
    });

    var close = function(callback) {
        db.close(callback);
    };

    var insert_alternates = function(entry, callback) {
        let is_snp = (entry.varinfo.type == 'SNP'),
            query = 'INSERT INTO alternates (AlternateID, Chromosome, Position, Alternate, SNP) VALUES (?,?,?,?,?)';
        db.run(query, 0, entry.chr, entry.pos, entry.ref, is_snp, callback);
        entry.alt.split(',').forEach(function(alt, i) {
            db.run(query, i + 1, entry.chr, entry.pos, alt, is_snp, callback);
        });
    };

    var insert_variants = function(entry, callback) {
        let query = 'INSERT INTO variants (SampleID, Chromosome, Position, ChromosomeCopy, AlternateID) VALUES (?,?,?,?,?)';
        entry.sampleinfo.forEach(function(variant, i) {
            variant.GT.split('/').forEach(function(v, j) {
                var alt = (v == '.') ? null : parseInt(v);
                db.run(query, variant.NAME, entry.chr, entry.pos, j + 1, alt);
            });
        });
    };

    var insert_entry = function(entry, callback) {
        insert_alternates(entry, callback);
        insert_variants(entry, callback);
    };

    var insert_environment = function(env, callback) {
        let query = 'INSERT INTO environment (SampleID, Name, Value) VALUES (?,?,?)';
        for (var sampleid in env) {
            let data = env[sampleid];
            for (var name in data) {
                let value = (data[name].length === 0) ? null : data[name];
                db.run(query, sampleid, name, value, callback);
            }
        }
    };

    return {
        insert_entry: insert_entry,
        insert_environment: insert_environment
    };
};
