// Copyright 2018 Greer Dolby, Douglas G. Moore. All rights reserved.
// Use of this source code is governed by a MIT
// license that can be found in the LICENSE file.
const jdb = require('./database');

module.exports = function(sid, chr, pos) {
    var db = new jdb.Database('jenna.db', function(err) {
        if (err !== null) {
            throw err;
        }
    });

    db.query(sid, chr, pos, function(err, data) {
        if (err !== null) {
            throw err;
        }
        console.log(data);
    });
};
