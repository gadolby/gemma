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

describe('term', function() {
    test('.throws without query', async function() {
        await expect(go.term()).rejects.toThrow(/no GO term ID provided/);
        await expect(go.term({})).rejects.toThrow(/illformed GO term ID/);
    });

    test('.can find term of form "GO:\\d{7}"', async function() {
        const expected = {
            'numberOfHits': 1,
            'results': [
                {
                    'id': 'GO:0036026',
                    'isObsolete': false,
                    'name': 'protein C inhibitor-PLAT complex',
                    'definition': {
                        'text': 'A heterodimeric protein complex that contains protein C inhibitor (SERPINA5) and tissue-type plasminogen activator (PLAT); formation of the complex inhibits the serine protease activity of tissue-type plasminogen activator.',
                        'xrefs': [
                            {
                                'dbCode': 'PMID',
                                'dbId': '10340997'
                            }
                        ]
                    },
                    'synonyms': [
                        {
                            'name': 'PCI-PLAT complex',
                            'type': 'exact'
                        },
                        {
                            'name': 'SERPINA5-PLAT complex',
                            'type': 'exact'
                        },
                        {
                            'name': 'plasma serine protease inhibitor-PLAT complex',
                            'type': 'exact'
                        },
                        {
                            'name': 'protein C inhibitor-tPA complex',
                            'type': 'exact'
                        },
                        {
                            'name': 'protein C inhibitor-tissue-type plasminogen activator complex',
                            'type': 'exact'
                        },
                        {
                            'name': 'serpin A5-PLAT complex',
                            'type': 'exact'
                        }
                    ],
                    'aspect': 'cellular_component',
                    'usage': 'Unrestricted'
                }
            ],
            'pageInfo': null
        };
        const got = await go.term('GO:0036026');
        got.results.map(result => result.synonyms.sort((a,b) => {
            return (a.name < b.name) ? -1 : (a.name > b.name) ? 1 : 0;
        }));
        return expect(got).toEqual(expected);
    });

    test('.can find term of form "\\d{7}"', async function() {
        const expected = {
            'numberOfHits': 1,
            'results': [
                {
                    'id': 'GO:0036026',
                    'isObsolete': false,
                    'name': 'protein C inhibitor-PLAT complex',
                    'definition': {
                        'text': 'A heterodimeric protein complex that contains protein C inhibitor (SERPINA5) and tissue-type plasminogen activator (PLAT); formation of the complex inhibits the serine protease activity of tissue-type plasminogen activator.',
                        'xrefs': [
                            {
                                'dbCode': 'PMID',
                                'dbId': '10340997'
                            }
                        ]
                    },
                    'synonyms': [
                        {
                            'name': 'PCI-PLAT complex',
                            'type': 'exact'
                        },
                        {
                            'name': 'SERPINA5-PLAT complex',
                            'type': 'exact'
                        },
                        {
                            'name': 'plasma serine protease inhibitor-PLAT complex',
                            'type': 'exact'
                        },
                        {
                            'name': 'protein C inhibitor-tPA complex',
                            'type': 'exact'
                        },
                        {
                            'name': 'protein C inhibitor-tissue-type plasminogen activator complex',
                            'type': 'exact'
                        },
                        {
                            'name': 'serpin A5-PLAT complex',
                            'type': 'exact'
                        }
                    ],
                    'aspect': 'cellular_component',
                    'usage': 'Unrestricted'
                }
            ],
            'pageInfo': null
        };
        const got = await go.term('0036026');
        got.results.map(result => result.synonyms.sort((a,b) => {
            return (a.name < b.name) ? -1 : (a.name > b.name) ? 1 : 0;
        }));
        return expect(got).toEqual(expected);
    });
});
