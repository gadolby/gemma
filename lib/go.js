const querystring = require('querystring');
const https = require('https');

const getRequest = function(host, path) {
    const headers = {Accept: 'application/json'};
    const options = {host, path, headers, method: 'GET'};
    return new Promise(function(resolve, reject) {
        https.request(options, function(res) {
            res.setEncoding('utf-8');
            let chunks=[];
            res.on('data', chunk => chunks.push(chunk));
            res.on('error', err => reject(err));
            res.on('end', function() {
                try {
                    resolve(JSON.parse(chunks.join('')));
                } catch(e) {
                    reject(e);
                }
            });
        }).end();
    });
};

const EBIHOST = 'www.ebi.ac.uk';

const search = async function(data) {
    const path = '/QuickGO/services/ontology/go/search';

    if (data === undefined) {
        throw new Error('no search query provided');
    } else if (data.query === undefined) {
        throw new Error('no "query" property in search data');
    }

    data.limit = data.limit || 25;
    data.page = data.page || 1;

    return getRequest(EBIHOST, path + '?' + querystring.stringify(data));
};

const term = async function(termid) {
    const path = '/QuickGO/services/ontology/go/terms';

    if (termid === undefined) {
        throw new Error('no GO term ID provided');
    } else if (/^\s*\d{7}\s*$/.exec(termid) !== null) {
        termid = 'GO:' + termid.trim();
    } else if (/^\s*GO:\d{7}\s*$/.exec(termid) !== null) {
        termid = termid.trim();
    } else {
        const msg = 'illformed GO term ID' +
            `, got ${JSON.stringify(termid)}, expected "GO:#######"`;
        throw new Error(msg);
    }

    return getRequest(EBIHOST, path + '/' + termid);
};

const proteins = async function(termid) {
    const path = '/proteins/api/proteins';
    const terms = await term(termid);
    const { name } = terms.results[0];
    if (name === undefined) {
        throw new Error(`no GO term with id ${termid} was found`);
    }
    return getRequest(EBIHOST, path + '?' + querystring.stringify({ goterms: name }));
};

module.exports = { search, term, proteins };
