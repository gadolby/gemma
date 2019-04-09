const fs = require('fs-extra');
const imp = require('../lib/import');
const jdb = require('../lib/database');
const path = require('path');
const query = require('../lib/query');

const assetsPath = path.join(__dirname, 'assets');
const dbFile  = path.join(assetsPath, 'gemma-query.db');
const emptyDb = path.join(assetsPath, 'gemma-query-empty.db');
const vcfFile = path.join(assetsPath, 'vcf', 'valid', 'sample.vcf');

beforeEach(async function() {
    await expect(imp.vcf(vcfFile, { database: dbFile })).resolves.toBe(3);
    return expect(jdb.Database(dbFile).then(db => db.close())).resolves.toBeUndefined();
});

afterEach(function() {
    if (fs.existsSync(dbFile)) {
        fs.unlinkSync(dbFile);
    }
    if (fs.existsSync(emptyDb)) {
        fs.unlinkSync(emptyDb);
    }
});

test('list samples', async function() {
    await expect(query.listSamples({ database: dbFile }))
        .resolves.toEqual(['SAMPLE_A', 'SAMPLE_B']);

    return expect(query.listSamples({ database: emptyDb }))
        .resolves.toEqual([]);
});

test('list chromosomes', async function() {
    await expect(query.listChromosomes({ database: dbFile }))
        .resolves.toEqual(['scaffold_1', 'scaffold_2']);

    return expect(query.listChromosomes({ database: emptyDb }))
        .resolves.toEqual([]);
});
