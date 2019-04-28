const jdb = require('./database');
const go = require('./go');

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

const goSearch = function(query) {
    return go.search({ query })
        .then(data => data.results.map(function(result) {
            return {
                id: result.id,
                name: result.name,
                aspect: result.aspect
            };
        }));
};

const goTerm = function(goterm) {
    return go.term(goterm)
        .then(data => data.results.map(function(result) {
            return {
                id: result.id,
                name: result.name,
                synonyms: result.synonyms,
                aspect: result.aspect
            };
        }));
};

module.exports = { listChromosomes, listSamples, goSearch, goTerm };
