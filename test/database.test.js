const fs = require('fs-extra');
const path = require('path');
const { Database } = require('../lib/database');

const dbFile = path.join(__dirname, 'assets', 'gemma-database.db');

beforeEach(function() {
    fs.ensureDirSync(path.dirname(dbFile));
});

afterEach(function() {
    fs.unlinkSync(dbFile);
});

test('creates database file', async function() {
    const db = await Database(dbFile);
    expect(fs.existsSync(dbFile)).toBeTruthy();

    return await db.close();
});

test('creates tables', async function() {
    const db = await Database(dbFile);
    const tables = await db.handle.all('select name from sqlite_master where type="table"')
        .then(tables => tables.map(t => t.name).sort());
    expect(tables).toEqual([
        'alternates',
        'environment',
        'genes',
        'subgenes',
        'variants'
    ]);

    return await db.close();
});

test.each`
table            | expectedColumns
${'alternates'}  | ${[['AlternateID','int'],['Chromosome','string'],['Position','int'],['Alternate','string'],['SNP','int']]}
${'variants'}    | ${[['SampleID','string'],['Chromosome','string'],['Position','int'],['ChromosomeCopy','int'],['AlternateID','int']]}
${'environment'} | ${[['SampleID','string'],['Name','string'],['Value','string']]}
${'genes'}       | ${[['GeneID','string'],['Source','string'],['Start','int'],['End','int'],['Note','string']]}
${'subgenes'}    | ${[['GeneID','string'],['ID','string'],['Source','string'],['Type','string'],['Start','int'],['End','int'],['Note','string']]}
`('creates correct columns for table $table', async function({ table, expectedColumns }) {
    const sorter = (a, b) => (a[0] < b[0]) ? -1 : (a[0] > b[0]) ? 1 : 0;
    const db = await Database(dbFile);
    const columns = await db.handle.all(`PRAGMA table_info(${table})`)
        .then(columns => columns.map(c => [ c.name, c.type ]));
    expect(columns.sort(sorter)).toEqual(expectedColumns.sort(sorter));

    return await db.close();
});

test('can insert alternates', async function() {
    const entry = {
        sampleinfo: [
            { name: 'sample1', GT: ['0','1'] },
            { name: 'sample2', GT: ['1','2'] },
            { name: 'sample3', GT: ['3','.'] },
            { name: 'sample4', GT: ['4','4'] }
        ],
        chrom: 'scaffold_1',
        pos: 10,
        ref: 'A',
        alt: ['C','T','CT','GTG']
    };
    const db = await Database(dbFile);
    await db.insert_entry(entry);
    const rows = await db.handle.all('SELECT * FROM alternates');
    expect(rows.sort((a,b) => a.AlternateID - b.AlternateID)).toEqual([
        { AlternateID: 0, Alternate: 'A',   Chromosome: 'scaffold_1', Position: 10, SNP: 0 },
        { AlternateID: 1, Alternate: 'C',   Chromosome: 'scaffold_1', Position: 10, SNP: 1 },
        { AlternateID: 2, Alternate: 'T',   Chromosome: 'scaffold_1', Position: 10, SNP: 1 },
        { AlternateID: 3, Alternate: 'CT',  Chromosome: 'scaffold_1', Position: 10, SNP: 0 },
        { AlternateID: 4, Alternate: 'GTG', Chromosome: 'scaffold_1', Position: 10, SNP: 0 },
    ]);

    return await db.close();
});

test('can insert variants', async function() {
    const sorter = function(a, b) {
        if (a.SampleID < b.SampleID) {
            return -1;
        } else if (a.SampleID > b.SampleID) {
            return 1;
        } else {
            return a.ChromosomeCopy - b.ChromosomeCopy;
        }
    };
    const entry = {
        sampleinfo: [
            { name: 'sample1', GT: ['0','1'] },
            { name: 'sample2', GT: ['1','2'] },
            { name: 'sample3', GT: ['3','.'] },
            { name: 'sample4', GT: ['4','4'] }
        ],
        chrom: 'scaffold_1',
        pos: 10,
        ref: 'A',
        alt: ['C','T','CT','GTG']
    };
    const db = await Database(dbFile);
    await db.insert_entry(entry);
    const rows = await db.handle.all('SELECT * FROM variants');
    expect(rows.sort(sorter)).toEqual([
        { SampleID: 'sample1', Chromosome: 'scaffold_1', Position: 10, ChromosomeCopy: 1, AlternateID: 0 },
        { SampleID: 'sample1', Chromosome: 'scaffold_1', Position: 10, ChromosomeCopy: 2, AlternateID: 1 },
        { SampleID: 'sample2', Chromosome: 'scaffold_1', Position: 10, ChromosomeCopy: 1, AlternateID: 1 },
        { SampleID: 'sample2', Chromosome: 'scaffold_1', Position: 10, ChromosomeCopy: 2, AlternateID: 2 },
        { SampleID: 'sample3', Chromosome: 'scaffold_1', Position: 10, ChromosomeCopy: 1, AlternateID: 3 },
        { SampleID: 'sample3', Chromosome: 'scaffold_1', Position: 10, ChromosomeCopy: 2, AlternateID: null },
        { SampleID: 'sample4', Chromosome: 'scaffold_1', Position: 10, ChromosomeCopy: 1, AlternateID: 4 },
        { SampleID: 'sample4', Chromosome: 'scaffold_1', Position: 10, ChromosomeCopy: 2, AlternateID: 4 },
    ]);

    return await db.close();
});

test('can add environmental variables', async function() {
    const fieldSorter = (a, b, field) => (a[field] < b[field]) ? -1 : (a[field] > b[field]) ? 1 : 0;
    const sorter = function (a, b) {
        const s = fieldSorter(a, b, 'SampleID');
        return s ? s : fieldSorter(a, b, 'Name');
    };
    const env = {
        'sample1': {
            'temperature': 290,
            'elevation': 1000,
            'name': 'Susan'
        },
        'sample2': {
            'temperature': 300,
            'elevation': 900,
            'name': 'Jim'
        },
        'sample3': {
            'temperature': 305,
            'elevation': 800,
            'name': 'Alice'
        },
        'sample4': {
            'temperature': 305,
            'elevation': 800,
            'name': 'Bob'
        },
        'sample5': {
            'temperature': '',
            'name': 'Gemma'
        },
    };
    const db = await Database(dbFile);
    await db.insert_environment(env);
    const rows = await db.handle.all('SELECT * FROM environment');
    expect(rows.sort(sorter)).toEqual([
        { 'SampleID': 'sample1', 'Name': 'elevation',    'Value': 1000 },
        { 'SampleID': 'sample1', 'Name': 'name',        'Value': 'Susan' },
        { 'SampleID': 'sample1', 'Name': 'temperature', 'Value': 290 },
        { 'SampleID': 'sample2', 'Name': 'elevation',    'Value': 900 },
        { 'SampleID': 'sample2', 'Name': 'name',        'Value': 'Jim' },
        { 'SampleID': 'sample2', 'Name': 'temperature', 'Value': 300 },
        { 'SampleID': 'sample3', 'Name': 'elevation',    'Value': 800 },
        { 'SampleID': 'sample3', 'Name': 'name',        'Value': 'Alice' },
        { 'SampleID': 'sample3', 'Name': 'temperature', 'Value': 305 },
        { 'SampleID': 'sample4', 'Name': 'elevation',    'Value': 800 },
        { 'SampleID': 'sample4', 'Name': 'name',        'Value': 'Bob' },
        { 'SampleID': 'sample4', 'Name': 'temperature', 'Value': 305 },
        { 'SampleID': 'sample5', 'Name': 'name',        'Value': 'Gemma' },
        { 'SampleID': 'sample5', 'Name': 'temperature', 'Value': null }
    ]);

    return await db.close();
});

test('can add gene features', async function() {
    const entry = {
        source: 'matcher',
        type: 'gene',
        start: 123,
        end: 256,
        attributes: {
            ID: 'MyGene',
            Parent: 'MyGene',
            Note: 'Similar to Doug'
        }
    };
    const db = await Database(dbFile);
    await db.insert_gene_feature(entry);
    const gene_rows = await db.handle.all('SELECT * FROM genes');
    expect(gene_rows).toEqual([
        { GeneID: 'MyGene', Source: 'matcher', Start: 123, End: 256, Note: 'Similar to Doug' }
    ]);
    expect(await db.handle.all('SELECT * FROM subgenes')).toHaveLength(0);

    return await db.close();
});

test('can add subgene features', async function() {
    const entry = {
        source: 'matcher',
        type: 'exon',
        start: 123,
        end: 152,
        attributes: {
            ID: 'MyGene:exon',
            Parent: 'MyGene'
        }
    };
    const db = await Database(dbFile);
    await db.insert_gene_feature(entry);
    const gene_rows = await db.handle.all('SELECT * FROM subgenes');
    expect(gene_rows).toEqual([
        { GeneID: 'MyGene', ID: 'MyGene:exon', Source: 'matcher', Type: 'exon', Start: 123, End: 152, Note: null }
    ]);
    expect(await db.handle.all('SELECT * FROM genes')).toHaveLength(0);

    return await db.close();
});

test('can list from a table', async function() {
    const entry = {
        sampleinfo: [
            { name: 'sample1', GT: ['0','1'] },
            { name: 'sample2', GT: ['1','2'] },
            { name: 'sample3', GT: ['3','.'] },
            { name: 'sample4', GT: ['4','4'] }
        ],
        chrom: 'scaffold_1',
        pos: 10,
        ref: 'A',
        alt: ['C','T','CT','GTG']
    };
    const db = await Database(dbFile);
    await db.insert_entry(entry);

    let chromosomes = await db.list('alternates', 'Chromosome');
    expect(chromosomes).toHaveLength(5);
    expect(chromosomes.every(c => c === 'scaffold_1')).toBeTruthy();

    chromosomes = await db.list('alternates', 'Chromosome', { distinct: true });
    expect(chromosomes).toEqual(['scaffold_1']);

    return await db.close();
});

test('can query variants', async function() {
    const entry = {
        sampleinfo: [
            { name: 'sample1', GT: ['0','1'] },
            { name: 'sample2', GT: ['1','2'] },
            { name: 'sample3', GT: ['3','.'] },
            { name: 'sample4', GT: ['4','4'] }
        ],
        chrom: 'scaffold_1',
        pos: 10,
        ref: 'A',
        alt: ['C','T','CT','GTG']
    };
    const env = {
        'sample1': {
            'temperature': 290,
            'elevation': 1000,
            'name': 'Susan'
        },
        'sample2': {
            'temperature': 300,
            'elevation': 900,
            'name': 'Jim'
        },
        'sample3': {
            'temperature': 305,
            'elevation': 800,
            'name': 'Alice'
        },
        'sample4': {
            'temperature': 305,
            'elevation': 800,
            'name': 'Bob'
        }
    };
    const db = await Database(dbFile);
    await db.insert_entry(entry);
    await db.insert_environment(env);

    let variants = await db.query('sample1', 'scaffold_1', 10);
    expect(variants).toEqual({
        SampleId: 'sample1',
        Chromosome: 'scaffold_1',
        Position: 10,
        Alternates: ['A','C'],
        Environment: {
            temperature: 290,
            elevation: 1000,
            name: 'Susan'
        }
    });

    variants = await db.query('sample3', 'scaffold_1', 10);
    expect(variants).toEqual({
        SampleId: 'sample3',
        Chromosome: 'scaffold_1',
        Position: 10,
        Alternates: ['CT', '.'],
        Environment: {
            temperature: 305,
            elevation: 800,
            name: 'Alice'
        }
    });

    variants = await db.query('sample4', 'scaffold_1', 10);
    expect(variants).toEqual({
        SampleId: 'sample4',
        Chromosome: 'scaffold_1',
        Position: 10,
        Alternates: ['GTG','GTG'],
        Environment: {
            temperature: 305,
            elevation: 800,
            name: 'Bob'
        }
    });

    await expect(db.query('sample5', 'scaffold_1', 10)).rejects.toEqual({});
    await expect(db.query('sample1', 'scaffold_2', 10)).rejects.toEqual({});
    await expect(db.query('sample1', 'scaffold_1', 100)).rejects.toEqual({});

    return await db.close();
});
