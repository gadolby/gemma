const jdb = require('./database');

const listSamples = function(cmd) {
    return jdb.Database(cmd.database)
        .then(db => db.list('variants', 'SampleID', { distinct: true }))
        .then(function(data) {
            process.stdout.write(data.length + ' samples found\n');
            data.forEach(entry => process.stdout.write('  ' + entry + '\n'));
        });
};

const query = function(sid, chr, pos, cmd) {
    return jdb.Database(cmd.database)
        .then(db => db.query(sid, chr, pos))
        .then(data => process.stdout.write(JSON.stringify(data, null, 2) + '\n'));
};

module.exports = { listSamples, query };
