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

const getProteinName = function({recommendedName, submittedName, alternativeName}) {
    if (recommendedName) {
        return recommendedName.fullName.value;
    } else if (submittedName) {
        return submittedName[0].fullName.value;
    } else if (alternativeName) {
        return alternativeName[0].fullName.value;
    }
    return undefined;
};

const getGeneName = function({name, orfNames}) {
    if (name) {
        return name.value;
    } else if (orfNames) {
        return orfNames.map(name => name.value);
    }
    return undefined;
};

const goProteins = function(goterm) {
    return go.proteins(goterm)
        .then(data => data.map(function(result) {
            return {
                id: result.id,
                protein: (result.protein) ? getProteinName(result.protein) : undefined,
                genes: (result.gene) ? [].concat(...result.gene.map(getGeneName)) : undefined
            };
        }));
};

module.exports = { listChromosomes, listSamples, goSearch, goTerm, goProteins };
