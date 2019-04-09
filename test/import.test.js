const fs = require('fs-extra');
const path = require('path');
const { vcf, gff, env } = require('../lib/import');
const { Database } = require('../lib/database');

const assetsPath = path.join(__dirname, 'assets');
const dbFile  = path.join(assetsPath, 'gemma-import.db');

const invalidVCFPath = path.join(assetsPath, 'vcf', 'invalid');
const validVCFPath = path.join(assetsPath, 'vcf', 'valid');

const invalidGFFPath = path.join(assetsPath, 'gff', 'invalid');
const validGFFPath = path.join(assetsPath, 'gff', 'valid');

const invalidEnvPath = path.join(assetsPath, 'env', 'invalid');
const validEnvPath = path.join(assetsPath, 'env', 'valid');

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
    const invalidVCFs = fs.readdirSync(invalidVCFPath);
    test.each(invalidVCFs)('.fail "%s"', async function(filename) {
        const filepath = path.join(invalidVCFPath, filename);
        expect(fs.existsSync(filepath)).toBeTruthy();

        return expect(vcf(filepath, { database: dbFile })).rejects.toThrow();
    });

    test.each([
        'no_samples.vcf',
        'only_mandatory.vcf',
    ])('.succeed with no output "%s"', async function(filename) {
        const filepath = path.join(validVCFPath, filename);
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

        const filepath = path.join(validVCFPath, filename);

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

        return db.close();
    });

    test('.error for multiple import without append', async function() {
        const vcfFile = path.join(validVCFPath, 'sample.vcf');
        await vcf(vcfFile, { database: dbFile });
        return expect(vcf(vcfFile, { database: dbFile })).rejects.toMatch(/already been imported/);
    });

    test('.error for multiple of same vcf', async function() {
        const vcfFile = path.join(validVCFPath, 'sample.vcf');
        await vcf(vcfFile, { database: dbFile });
        return expect(vcf(vcfFile, { database: dbFile, append: true }))
            .rejects.toThrow(/SQLITE_CONSTRAINT/);
    });

    test('.can append', async function() {
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

        const sample = path.join(validVCFPath, 'sample.vcf');
        const orthogonal = path.join(validVCFPath, 'orthogonal.vcf');

        await expect(vcf(sample, { database: dbFile })).resolves.toBe(3);
        await expect(vcf(orthogonal, { database: dbFile, append: true })).resolves.toBe(3);

        const db = await Database(dbFile);
        const variants = await db.handle.all('SELECT * FROM variants');
        expect(variants.sort(variantSorter)).toEqual([
            { SampleID: 'SAMPLE_A', Chromosome: 'scaffold_1', Position: 672,  ChromosomeCopy: 1, AlternateID: 1 },
            { SampleID: 'SAMPLE_A', Chromosome: 'scaffold_1', Position: 672,  ChromosomeCopy: 2, AlternateID: 1 },
            { SampleID: 'SAMPLE_A', Chromosome: 'scaffold_1', Position: 5607, ChromosomeCopy: 1, AlternateID: 0 },
            { SampleID: 'SAMPLE_A', Chromosome: 'scaffold_1', Position: 5607, ChromosomeCopy: 2, AlternateID: 1 },
            { SampleID: 'SAMPLE_A', Chromosome: 'scaffold_1', Position: 8632,  ChromosomeCopy: 1, AlternateID: 1 },
            { SampleID: 'SAMPLE_A', Chromosome: 'scaffold_1', Position: 8632,  ChromosomeCopy: 2, AlternateID: 0 },
            { SampleID: 'SAMPLE_A', Chromosome: 'scaffold_1', Position: 87632, ChromosomeCopy: 1, AlternateID: 1 },
            { SampleID: 'SAMPLE_A', Chromosome: 'scaffold_1', Position: 87632, ChromosomeCopy: 2, AlternateID: 0 },
            { SampleID: 'SAMPLE_A', Chromosome: 'scaffold_2', Position: 2911, ChromosomeCopy: 1, AlternateID: 1 },
            { SampleID: 'SAMPLE_A', Chromosome: 'scaffold_2', Position: 2911, ChromosomeCopy: 2, AlternateID: 1 },
            { SampleID: 'SAMPLE_A', Chromosome: 'scaffold_2', Position: 9737, ChromosomeCopy: 1, AlternateID: 2 },
            { SampleID: 'SAMPLE_A', Chromosome: 'scaffold_2', Position: 9737, ChromosomeCopy: 2, AlternateID: 1 },
            { SampleID: 'SAMPLE_B', Chromosome: 'scaffold_1', Position: 672,  ChromosomeCopy: 1, AlternateID: 2 },
            { SampleID: 'SAMPLE_B', Chromosome: 'scaffold_1', Position: 672,  ChromosomeCopy: 2, AlternateID: null },
            { SampleID: 'SAMPLE_B', Chromosome: 'scaffold_1', Position: 5607, ChromosomeCopy: 1, AlternateID: 0 },
            { SampleID: 'SAMPLE_B', Chromosome: 'scaffold_1', Position: 5607, ChromosomeCopy: 2, AlternateID: 2 },
            { SampleID: 'SAMPLE_B', Chromosome: 'scaffold_1', Position: 8632,  ChromosomeCopy: 1, AlternateID: 2 },
            { SampleID: 'SAMPLE_B', Chromosome: 'scaffold_1', Position: 8632,  ChromosomeCopy: 2, AlternateID: 1 },
            { SampleID: 'SAMPLE_B', Chromosome: 'scaffold_1', Position: 87632, ChromosomeCopy: 1, AlternateID: 1 },
            { SampleID: 'SAMPLE_B', Chromosome: 'scaffold_1', Position: 87632, ChromosomeCopy: 2, AlternateID: 2 },
            { SampleID: 'SAMPLE_B', Chromosome: 'scaffold_2', Position: 2911, ChromosomeCopy: 1, AlternateID: 2 },
            { SampleID: 'SAMPLE_B', Chromosome: 'scaffold_2', Position: 2911, ChromosomeCopy: 2, AlternateID: 1 },
            { SampleID: 'SAMPLE_B', Chromosome: 'scaffold_2', Position: 9737, ChromosomeCopy: 1, AlternateID: 2 },
            { SampleID: 'SAMPLE_B', Chromosome: 'scaffold_2', Position: 9737, ChromosomeCopy: 2, AlternateID: 2 },
        ]);

        const alternates = await db.handle.all('SELECT * FROM alternates');
        expect(alternates.sort(alternateSorter)).toEqual([
            { Chromosome: 'scaffold_1', Position: 672,  AlternateID: 0, Alternate: 'CAAA', SNP: 0 },
            { Chromosome: 'scaffold_1', Position: 672,  AlternateID: 1, Alternate: 'CAA', SNP: 0 },
            { Chromosome: 'scaffold_1', Position: 672,  AlternateID: 2, Alternate: '*', SNP: 0 },
            { Chromosome: 'scaffold_1', Position: 5607, AlternateID: 0, Alternate: 'G', SNP: 0 },
            { Chromosome: 'scaffold_1', Position: 5607, AlternateID: 1, Alternate: 'C', SNP: 1 },
            { Chromosome: 'scaffold_1', Position: 5607, AlternateID: 2, Alternate: 'T', SNP: 1 },
            { Chromosome: 'scaffold_1', Position: 8632,  AlternateID: 0, Alternate: 'A', SNP: 0 },
            { Chromosome: 'scaffold_1', Position: 8632,  AlternateID: 1, Alternate: 'G', SNP: 1 },
            { Chromosome: 'scaffold_1', Position: 8632,  AlternateID: 2, Alternate: 'GG', SNP: 0 },
            { Chromosome: 'scaffold_1', Position: 87632, AlternateID: 0, Alternate: 'A', SNP: 0 },
            { Chromosome: 'scaffold_1', Position: 87632, AlternateID: 1, Alternate: 'GTG', SNP: 0 },
            { Chromosome: 'scaffold_1', Position: 87632, AlternateID: 2, Alternate: 'CTG', SNP: 0 },
            { Chromosome: 'scaffold_2', Position: 2911, AlternateID: 0, Alternate: 'ATA', SNP: 0 },
            { Chromosome: 'scaffold_2', Position: 2911, AlternateID: 1, Alternate: 'ATACTCGGTA', SNP: 0 },
            { Chromosome: 'scaffold_2', Position: 2911, AlternateID: 2, Alternate: 'AT', SNP: 0 },
            { Chromosome: 'scaffold_2', Position: 9737, AlternateID: 0, Alternate: 'A', SNP: 0 },
            { Chromosome: 'scaffold_2', Position: 9737, AlternateID: 1, Alternate: 'C', SNP: 1 },
            { Chromosome: 'scaffold_2', Position: 9737, AlternateID: 2, Alternate: '*', SNP: 0 },
        ]);

        return db.close();
    });
});

describe('import gff', function() {
    const invalidGFFs = fs.readdirSync(invalidGFFPath);
    test.each(invalidGFFs)('.fail "%s"', async function(filename) {
        const filepath = path.join(invalidGFFPath, filename);
        expect(fs.existsSync(filepath)).toBeTruthy();

        return expect(gff(filepath, { database: dbFile })).rejects.toThrow();
    });

    test('.can import', async function() {
        const gffFile = path.join(validGFFPath, 'sample.gff');

        const geneSorter = function(a, b) {
            const start = fieldSorter(a, b, 'Start');
            const end = -1 * fieldSorter(a, b, 'End');
            const p = (a.ID === b.ParentID) ? -1 : (b.ID === a.ParentID) ? 1 : 0;
            return (start) ? start : (end) ? end : p;
        };

        await expect(gff(gffFile, { database: dbFile })).resolves.toBe(3);

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
        return db.close();
    });

    test('.error for multiple import without append', async function() {
        const gffFile = path.join(validGFFPath, 'sample.gff');
        await gff(gffFile, { database: dbFile });
        return expect(gff(gffFile, { database: dbFile })).rejects.toMatch(/already been imported/);
    });

    test('.error for multiple of same gff', async function() {
        const gffFile = path.join(validGFFPath, 'sample.gff');
        await gff(gffFile, { database: dbFile });
        return expect(gff(gffFile, { database: dbFile, append: true }))
            .rejects.toThrow(/SQLITE_CONSTRAINT/);
    });

    test('.can append', async function() {
        const geneSorter = function(a, b) {
            const start = fieldSorter(a, b, 'Start');
            const end = -1 * fieldSorter(a, b, 'End');
            const p = (a.ID === b.ParentID) ? -1 : (b.ID === a.ParentID) ? 1 : 0;
            return (start) ? start : (end) ? end : p;
        };

        const sample = path.join(validGFFPath, 'sample.gff');
        const orthogonal = path.join(validGFFPath, 'orthogonal.gff');

        await expect(gff(sample, { database: dbFile })).resolves.toBe(3);
        await expect(gff(orthogonal, { database: dbFile, append: true })).resolves.toBe(3);

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
        }, {
            ParentID: null,
            ID: 'Gene',
            Source: 'maker',
            Type: 'gene',
            Start: 20000,
            End: 30000,
            Note: 'Similar to Something'
        }, {
            ParentID: 'Gene',
            ID: 'Gene-RA',
            Source: 'maker',
            Type: 'mRNA',
            Start: 20000,
            End: 30000,
            Note: 'Similar to Something'
        }, {
            ParentID: 'Gene-RA',
            ID: 'Gene-RA:exon',
            Source: 'maker',
            Type: 'exon',
            Start: 25000,
            End: 28000,
            Note: null
        }]);
        return db.close();
    });
});

describe('import enviroment', function() {
    const envSorter = function (a, b) {
        const s = fieldSorter(a, b, 'SampleID');
        return s ? s : fieldSorter(a, b, 'Name');
    };

    const validEnvs = fs.readdirSync(validEnvPath);

    test.each(validEnvs)('.can import "%s"', function(filename) {
        const envFile = path.join(validEnvPath, filename);
        return expect(env(envFile, { database: dbFile })).resolves.toBeUndefined();
    });

    test('.correctly imports', async function() {
        const envFile = path.join(validEnvPath, 'sample.csv');
        await env(envFile, { database: dbFile });

        const db = await Database(dbFile);
        const environment = await db.handle.all('SELECT * FROM environment');

        expect(environment.sort(envSorter)).toEqual([
            { SampleID: 'SAMPLE_A', Name: 'Elevation',      Value: 1000 },
            { SampleID: 'SAMPLE_A', Name: 'Name',           Value: 'Alice' },
            { SampleID: 'SAMPLE_A', Name: 'Temperature',    Value: 305 }
        ]);

        return db.close();
    });

    test('.error for multiple import without append', async function() {
        const envFile = path.join(validEnvPath, 'sample.csv');
        await env(envFile, { database: dbFile });
        return expect(env(envFile, { database: dbFile })).rejects.toMatch(/already been imported/);
    });

    test('.error for multiple import of same env', async function() {
        const envFile = path.join(validEnvPath, 'sample.csv');
        await env(envFile, { database: dbFile });
        return expect(env(envFile, { database: dbFile, append: true })).rejects.toThrow();
    });

    test('.can append', async function() {
        const sample = path.join(validEnvPath, 'sample.csv');
        const newSample = path.join(validEnvPath, 'orthogonal_new_sample.csv');
        const newVariable = path.join(validEnvPath, 'orthogonal_new_variable.csv');

        await env(sample, { database: dbFile });
        await env(newSample, { database: dbFile, append: true });
        await env(newVariable, { database: dbFile, append: true });

        const db = await Database(dbFile);
        const environment = await db.handle.all('SELECT * FROM environment');
        expect(environment.sort(envSorter)).toEqual([
            { SampleID: 'SAMPLE_A', Name: 'Elevation',      Value: 1000 },
            { SampleID: 'SAMPLE_A', Name: 'Name',           Value: 'Alice' },
            { SampleID: 'SAMPLE_A', Name: 'Precipitation',  Value: '28cm' },
            { SampleID: 'SAMPLE_A', Name: 'Temperature',    Value: 305 },
            { SampleID: 'SAMPLE_B', Name: 'Elevation',      Value: 1100 },
            { SampleID: 'SAMPLE_B', Name: 'Name',           Value: 'Bob' },
            { SampleID: 'SAMPLE_B', Name: 'Precipitation',  Value: '21cm' },
            { SampleID: 'SAMPLE_B', Name: 'Temperature',    Value: 300 },
        ]);

        return db.close();
    });

    test.each`
        filename            | error
        ${'syntax.csv'}     | ${/Number of columns is inconsistent/}
        ${'nosamples.csv'}  | ${/Environmental data does not include SampleIDs/}
        ${'dupsamples.csv'} | ${/duplicate SampleID/}
    `('.throws for invalid environment file "$filename"', function({ filename, error }) {
    const filepath = path.join(invalidEnvPath, filename);
    return expect(env(filepath, { database: dbFile })).rejects.toThrow(error);
});
});
