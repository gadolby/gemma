const jdb = require('./database');

const listSamples = async function(cmd) {
    const db = await jdb.Database(cmd.database);
    return db.list('variants', 'SampleID', { distinct: true })
        .then(data => data.sort())
        .finally(() => db.close());
};

const listChromosomes = async function(cmd) {
    const db = await jdb.Database(cmd.database);
    return db.list('variants', 'Chromosome', { distinct: true })
        .then(data => data.sort())
        .finally(() => db.close());
};

module.exports = { listChromosomes, listSamples };
