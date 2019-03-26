const fs = require('fs-extra');
const path = require('path');
const { vcf, gff, env } = require('../lib/import');
const { Database } = require('../lib/database');

const dbFile = path.join('test','assets','gemma-import.db');
const vcfFile = path.join('test', 'assets', 'vcf', 'sample.vcf');
const gffFile = path.join('test', 'assets', 'gff', 'sample.gff');
const ecoFile = path.join('test', 'assets', 'env', 'valid.csv');

const fieldSorter = (a, b, f) => (a[f] < b[f]) ? -1 : (a[f] > b[f]) ? 1 : 0;

beforeEach(function() {
    fs.ensureDirSync(path.dirname(dbFile));
});

afterEach(function() {
    if (fs.existsSync(dbFile)) {
        fs.unlinkSync(dbFile);
    }
});

test('can import vcf', async function() {
    const variantSorter = function(a, b) {
        const c = fieldSorter(a, b, 'Chromosome');
        const p = fieldSorter(a, b, 'Position');
        const cc = fieldSorter(a, b, 'ChromosomeCopy');
        return (c) ? c : (p) ? p : cc;
    };

    const alternateSorter = function(a, b) {
        const c = fieldSorter(a, b, 'Chromosome');
        const p = fieldSorter(a, b, 'Position');
        const ai = fieldSorter(a, b, 'AlternateID');
        return (c) ? c : (p) ? p : ai;
    };

    const n = await vcf(vcfFile, { database: dbFile });
    expect(n).toBe(3);

    const db = await Database(dbFile);
    const variants = await db.handle.all('SELECT * FROM variants');
    expect(variants.sort(variantSorter)).toEqual([
        { SampleID: 'SAMPLE_A', Chromosome: 'scaffold_1', Position: 672,  ChromosomeCopy: 1, AlternateID: 1 },
        { SampleID: 'SAMPLE_A', Chromosome: 'scaffold_1', Position: 672,  ChromosomeCopy: 2, AlternateID: 1 },
        { SampleID: 'SAMPLE_A', Chromosome: 'scaffold_1', Position: 5607, ChromosomeCopy: 1, AlternateID: 0 },
        { SampleID: 'SAMPLE_A', Chromosome: 'scaffold_1', Position: 5607, ChromosomeCopy: 2, AlternateID: 1 },
        { SampleID: 'SAMPLE_A', Chromosome: 'scaffold_2', Position: 2911, ChromosomeCopy: 1, AlternateID: 1 },
        { SampleID: 'SAMPLE_A', Chromosome: 'scaffold_2', Position: 2911, ChromosomeCopy: 2, AlternateID: 1 }
    ]);

    const alternates = await db.handle.all('SELECT * FROM alternates');
    expect(alternates.sort(alternateSorter)).toEqual([
        { Chromosome: 'scaffold_1', Position: 672,  AlternateID: 0, Alternate: 'CAAA', SNP: 0 },
        { Chromosome: 'scaffold_1', Position: 672,  AlternateID: 1, Alternate: 'CAA', SNP: 0 },
        { Chromosome: 'scaffold_1', Position: 5607, AlternateID: 0, Alternate: 'G', SNP: 0 },
        { Chromosome: 'scaffold_1', Position: 5607, AlternateID: 1, Alternate: 'C', SNP: 1 },
        { Chromosome: 'scaffold_2', Position: 2911, AlternateID: 0, Alternate: 'ATA', SNP: 0 },
        { Chromosome: 'scaffold_2', Position: 2911, AlternateID: 1, Alternate: 'ATACTCGGTA', SNP: 0 },
    ]);

    await db.close();
});

test('can import gff', async function() {
    const geneSorter = function(a, b) {
        const start = fieldSorter(a, b, 'Start');
        const end = -1 * fieldSorter(a, b, 'End');
        return (start) ? start : end;
    };

    const n = await gff(gffFile, { database: dbFile });
    expect(n).toBe(3);

    const db = await Database(dbFile);
    const genes = await db.handle.all('SELECT * FROM genes');
    expect(genes.sort(geneSorter)).toEqual([
        { GeneID: 'SPLAT', Source: 'maker', Start: 2446, End: 17292, Note: 'Similar to PLAT: Tissue-type plasminogen activator (Pongo abelii)' }
    ]);

    const subgenes = await db.handle.all('SELECT * FROM subgenes');
    expect(subgenes.sort(geneSorter)).toEqual([
        { GeneID: 'SPLAT', ID: 'SPLAT-RA', Source: 'maker', Type: 'mRNA', Start: 2446, End: 17292, Note: 'Similar to PLAT: Tissue-type plasminogen activator (Pongo abelii)' },
        { GeneID: 'SPLAT-RA', ID: 'SPLAT-RA:exon:4045', Source: 'maker', Type: 'exon', Start: 2446, End: 2545, Note: null }
    ]);

    await db.close();
});

test('can import environment', async function() {
    const envSorter = function (a, b) {
        const s = fieldSorter(a, b, 'SampleID');
        return s ? s : fieldSorter(a, b, 'Name');
    };
    await env(ecoFile, { database: dbFile });
    const db = await Database(dbFile);
    const environment = await db.handle.all('SELECT * FROM environment');
    expect(environment.sort(envSorter)).toEqual([
        { SampleID: 'SAMPLE_A', Name: 'Elevation',      Value: 1000 },
        { SampleID: 'SAMPLE_A', Name: 'Name',           Value: 'Alice' },
        { SampleID: 'SAMPLE_A', Name: 'Temperature',    Value: 305 }
    ]);
});

test.each`
filename            | error
${'syntax.csv'}     | ${/Number of columns is inconsistent/}
${'nosamples.csv'}  | ${/Environmental data does not include SampleIDs/}
${'dupsamples.csv'} | ${/duplicate SampleID/}
`('throws for invalid environment file "$filename"', function({ filename, error }) {
    const filepath = path.join('test', 'assets', 'env', filename);
    expect(env(filepath, { database: dbFile })).rejects.toThrow(error);
});
