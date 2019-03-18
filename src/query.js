const jdb = require('./database');

module.exports = function(sid, chr, pos, cmd) {
    let db = new jdb.Database(cmd.database, function(err) {
        if (err !== null) {
            throw err;
        }
    });

    db.query(sid, chr, pos, function(err, data) {
        if (err !== null) {
            throw err;
        }
        process.stdout.write(data + '\n');
    });
};
