const go = require('../lib/go');

describe('search', function() {
    test('.throws without query', async function() {
        await expect(go.search()).rejects.toThrow(/no search query/);
        await expect(go.search({})).rejects.toThrow(/no "query" property/);
        return expect(go.search({ limit: 5, page: 2 })).rejects.toThrow(/no "query" property/);
    });

    test('.can search', function() {
        return expect(go.search({ query: 'PLAT', limit: 2, page: 1 })).resolves.toEqual({
            'numberOfHits': 212,
            'results': [
                {
                    'id': 'GO:0036026',
                    'isObsolete': false,
                    'name': 'protein C inhibitor-PLAT complex',
                    'definition': {
                        'text': 'A heterodimeric protein complex that contains protein C inhibitor (SERPINA5) and tissue-type plasminogen activator (PLAT); formation of the complex inhibits the serine protease activity of tissue-type plasminogen activator.'
                    },
                    'aspect': 'cellular_component'
                },
                {
                    'id': 'GO:0030168',
                    'isObsolete': false,
                    'name': 'platelet activation',
                    'definition': {
                        'text': 'A series of progressive, overlapping events triggered by exposure of the platelets to subendothelial tissue. These events include shape change, adhesiveness, aggregation, and release reactions. When carried through to completion, these events lead to the formation of a stable hemostatic plug.'
                    },
                    'aspect': 'biological_process'
                }
            ],
            'pageInfo': {
                'resultsPerPage': 2,
                'current': 1,
                'total': 106
            }
        });
    });
});
