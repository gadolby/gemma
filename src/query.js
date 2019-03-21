const jdb = require('./database');

module.exports = function(sid, chr, pos, cmd) {
    return jdb.Database(cmd.database)
        .then(db => db.query(sid, chr, pos))
        .then(data => process.stdout.write(JSON.stringify(data, null, 2) + '\n'))
        .catch(err => {
            process.stderr.write(err + '\n');
            process.exit(1);
        });
};
