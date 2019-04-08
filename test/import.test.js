const fs = require('fs-extra');
const path = require('path');
const { vcf, gff, env } = require('../lib/import');
const { Database } = require('../lib/database');

const assetsPath = path.join(__dirname, 'assets');
const dbFile  = path.join(assetsPath, 'gemma-import.db');
const gffFile = path.join(assetsPath, 'gff', 'sample.gff');
const ecoFile = path.join(assetsPath, 'env', 'valid.csv');

const fieldSorter = (a, b, f) => (a[f] < b[f]) ? -1 : (a[f] > b[f]) ? 1 : 0;

beforeEach(function() {
    fs.ensureDirSync(path.dirname(dbFile));
});

afterEach(function() {
    if (fs.existsSync(dbFile)) {
        fs.unlinkSync(dbFile);
    }
});

describe('import vcf', function() {
    test.each([
        'duplicate_column.vcf',
        'duplicate_header.vcf',
        'duplicate_sample.vcf',
        'extra_sample_parts.vcf',
        'illformed_info.vcf',
        'invalid_alt_dot.vcf',
        'invalid_alt_q.vcf',
        'invalid_genotypes.vcf',
        'invalid_ploidy.vcf',
        'invalid_ref_star.vcf',
        'missing_column.vcf',
        'missing_sample_parts.vcf',
        'no_alternates.vcf',
        'no_fileformat.vcf',
        'no_format.vcf',
        'too_few_columns.vcf',
        'too_few_samples_1.vcf',
        'too_few_samples_2.vcf',
        'too_many_samples.vcf'
    ])('.fail at parse "%s"', async function(filename) {
        const filepath = path.join(assetsPath, 'vcf', 'invalid', filename);
        expect(fs.existsSync(filepath)).toBeTruthy();

        return expect(vcf(filepath, { database: dbFile })).rejects.toThrow();
    });

    test.each([
        'no_genotypes.vcf',
    ])('.fail at write "%s"', async function(filename) {
        const filepath = path.join(assetsPath, 'vcf', 'valid', filename);
        expect(fs.existsSync(filepath)).toBeTruthy();

        return expect(vcf(filepath, { database: dbFile })).rejects.toThrow();
    });

    test.each([
        'no_samples.vcf',
        'only_mandatory.vcf',
    ])('.succeed with no output "%s"', async function(filename) {
        const filepath = path.join(assetsPath, 'vcf', 'valid', filename);
        expect(fs.existsSync(filepath)).toBeTruthy();

        await expect(vcf(filepath, { database: dbFile })).resolves.toBe(3);
        const db = await Database(dbFile);
        await expect(db.handle.all('SELECT * FROM variants')).resolves.toEqual([]);

        return db.close();
    });

    test.each([
        'sample.vcf'
    ])('.succeed on "%s"', async function(filename) {
        const variantSorter = function(a, b) {
            const s = fieldSorter(a, b, 'SampleID');
            const c = fieldSorter(a, b, 'Chromosome');
            const p = fieldSorter(a, b, 'Position');
            const cc = fieldSorter(a, b, 'ChromosomeCopy');
            return (s) ? s : (c) ? c : (p) ? p : cc;
        };

        const alternateSorter = function(a, b) {
            const c = fieldSorter(a, b, 'Chromosome');
            const p = fieldSorter(a, b, 'Position');
            const ai = fieldSorter(a, b, 'AlternateID');
            return (c) ? c : (p) ? p : ai;
        };

        const filepath = path.join(assetsPath, 'vcf', 'valid', filename);

        await expect(vcf(filepath, { database: dbFile })).resolves.toBe(3);

        const db = await Database(dbFile);
        const variants = await db.handle.all('SELECT * FROM variants');
        expect(variants.sort(variantSorter)).toEqual([
            { SampleID: 'SAMPLE_A', Chromosome: 'scaffold_1', Position: 672,  ChromosomeCopy: 1, AlternateID: 1 },
            { SampleID: 'SAMPLE_A', Chromosome: 'scaffold_1', Position: 672,  ChromosomeCopy: 2, AlternateID: 1 },
            { SampleID: 'SAMPLE_A', Chromosome: 'scaffold_1', Position: 5607, ChromosomeCopy: 1, AlternateID: 0 },
            { SampleID: 'SAMPLE_A', Chromosome: 'scaffold_1', Position: 5607, ChromosomeCopy: 2, AlternateID: 1 },
            { SampleID: 'SAMPLE_A', Chromosome: 'scaffold_2', Position: 2911, ChromosomeCopy: 1, AlternateID: 1 },
            { SampleID: 'SAMPLE_A', Chromosome: 'scaffold_2', Position: 2911, ChromosomeCopy: 2, AlternateID: 1 },
            { SampleID: 'SAMPLE_B', Chromosome: 'scaffold_1', Position: 672,  ChromosomeCopy: 1, AlternateID: 2 },
            { SampleID: 'SAMPLE_B', Chromosome: 'scaffold_1', Position: 672,  ChromosomeCopy: 2, AlternateID: null },
            { SampleID: 'SAMPLE_B', Chromosome: 'scaffold_1', Position: 5607, ChromosomeCopy: 1, AlternateID: 0 },
            { SampleID: 'SAMPLE_B', Chromosome: 'scaffold_1', Position: 5607, ChromosomeCopy: 2, AlternateID: 2 },
            { SampleID: 'SAMPLE_B', Chromosome: 'scaffold_2', Position: 2911, ChromosomeCopy: 1, AlternateID: 2 },
            { SampleID: 'SAMPLE_B', Chromosome: 'scaffold_2', Position: 2911, ChromosomeCopy: 2, AlternateID: 1 }
        ]);

        const alternates = await db.handle.all('SELECT * FROM alternates');
        expect(alternates.sort(alternateSorter)).toEqual([
            { Chromosome: 'scaffold_1', Position: 672,  AlternateID: 0, Alternate: 'CAAA', SNP: 0 },
            { Chromosome: 'scaffold_1', Position: 672,  AlternateID: 1, Alternate: 'CAA', SNP: 0 },
            { Chromosome: 'scaffold_1', Position: 672,  AlternateID: 2, Alternate: '*', SNP: 0 },
            { Chromosome: 'scaffold_1', Position: 5607, AlternateID: 0, Alternate: 'G', SNP: 0 },
            { Chromosome: 'scaffold_1', Position: 5607, AlternateID: 1, Alternate: 'C', SNP: 1 },
            { Chromosome: 'scaffold_1', Position: 5607, AlternateID: 2, Alternate: 'T', SNP: 1 },
            { Chromosome: 'scaffold_2', Position: 2911, AlternateID: 0, Alternate: 'ATA', SNP: 0 },
            { Chromosome: 'scaffold_2', Position: 2911, AlternateID: 1, Alternate: 'ATACTCGGTA', SNP: 0 },
            { Chromosome: 'scaffold_2', Position: 2911, AlternateID: 2, Alternate: 'AT', SNP: 0 },
        ]);

        return await db.close();
    });

    test('.error for multiple import without append', async function() {
        const vcfFile = path.join(assetsPath, 'vcf', 'valid', 'sample.vcf');
        await vcf(vcfFile, { database: dbFile });
        return expect(vcf(vcfFile, { database: dbFile })).rejects.toMatch(/already been imported/);
    });

    test('.error for multiple of same vcf', async function() {
        const vcfFile = path.join(assetsPath, 'vcf', 'valid', 'sample.vcf');
        await vcf(vcfFile, { database: dbFile });
        return expect(vcf(vcfFile, { database: dbFile, append: true }))
            .rejects.toThrow(/SQLITE_CONSTRAINT/);
    });
});

describe('import gff', function() {
    test('.can', async function() {
        const geneSorter = function(a, b) {
            const start = fieldSorter(a, b, 'Start');
            const end = -1 * fieldSorter(a, b, 'End');
            const p = (a.ID === b.ParentID) ? -1 : (b.ID === a.ParentID) ? 1 : 0;
            return (start) ? start : (end) ? end : p;
        };

        const n = await gff(gffFile, { database: dbFile });
        expect(n).toBe(3);

        const db = await Database(dbFile);
        const genes = await db.handle.all('SELECT * FROM genes');
        expect(genes.sort(geneSorter)).toEqual([{
            ParentID: null,
            ID: 'SPLAT',
            Source: 'maker',
            Type: 'gene',
            Start: 2446,
            End: 17292,
            Note: 'Similar to PLAT: Tissue-type plasminogen activator (Pongo abelii)'
        }, {
            ParentID: 'SPLAT',
            ID: 'SPLAT-RA',
            Source: 'maker',
            Type: 'mRNA',
            Start: 2446,
            End: 17292,
            Note: 'Similar to PLAT: Tissue-type plasminogen activator (Pongo abelii)'
        }, {
            ParentID: 'SPLAT-RA',
            ID: 'SPLAT-RA:exon:4045',
            Source: 'maker',
            Type: 'exon',
            Start: 2446,
            End: 2545,
            Note: null
        }]);
        return await db.close();
    });
});

describe('import enviroment', function() {
    test('.can', async function() {
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

        return await db.close();
    });

    test('.error for multiple import without append', async function() {
        await env(ecoFile, { database: dbFile });
        return expect(env(ecoFile, { database: dbFile })).rejects.toMatch(/already been imported/);
    });

    test('.error for multiple of same env', async function() {
        await env(ecoFile, { database: dbFile });
        return expect(env(ecoFile, { database: dbFile, append: true })).rejects.toThrow();
    });

    test.each`
        filename            | error
        ${'syntax.csv'}     | ${/Number of columns is inconsistent/}
        ${'nosamples.csv'}  | ${/Environmental data does not include SampleIDs/}
        ${'dupsamples.csv'} | ${/duplicate SampleID/}
    `('.throws for invalid environment file "$filename"', function({ filename, error }) {
    const filepath = path.join(assetsPath, 'env', filename);
    return expect(env(filepath, { database: dbFile })).rejects.toThrow(error);
});
});
