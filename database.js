// Copyright 2018 Greer Dolby, Douglas G. Moore. All rights reserved.
// Use of this source code is governed by a MIT
// license that can be found in the LICENSE file.
const sqlite3 = require('sqlite3').verbose();

module.exports.Database = function(filename='jenna.db', callback) {
    var db = new sqlite3.Database(filename, function(err) {
        if (err !== null) {
            callback(err);
        } else {
            this.run('pragma synchronous = OFF', callback);
            this.run('pragma journal_mode = MEMORY', callback);
            this.run('CREATE TABLE IF NOT EXISTS variants ( SampleID string, Chromosome string, Position int, ChromosomeCopy int, PRIMARY KEY (SampleID, Chromosome, Position, ChromosomeCopy) )', callback);
            this.run('CREATE TABLE IF NOT EXISTS reference ( Chromosome string, Position Int, PRIMARY KEY (Chromosome, Position) )', callback);
        }
    });

    var close = function(callback) {
        db.close(callback);
    };

    return {
        db: db
    };
};
