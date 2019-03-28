const fs = require('fs-extra');
const path = require('path');

describe('throws for invalid vcf', function() {
    const invalid_files = [
        ['duplicate_column.vcf', 1],
        ['duplicate_header.vcf', 1],
        ['duplicate_sample.vcf', 1],
        ['extra_sample_parts.vcf', 1],
        ['illformed_info.vcf', 1],
        ['invalid_alt_dot.vcf', 1],
        ['invalid_alt_q.vcf', 1],
        ['invalid_genotypes.vcf', 3],
        ['invalid_ploidy.vcf', 3],
        ['invalid_ref_star.vcf', 1],
        ['missing_column.vcf', 1],
        ['missing_sample_parts.vcf', 1],
        ['no_alternates.vcf', 1],
        ['no_fileformat.vcf', 1],
        ['no_format.vcf', 1],
        ['too_few_columns.vcf', 1],
        ['too_few_samples_1.vcf', 1],
        ['too_few_samples_2.vcf', 1],
        ['too_many_samples.vcf', 1],
    ];
    test.each(invalid_files)('.from file "%s"', async function(filename, numErrors) {
        const filepath = path.join(__dirname, 'assets', 'vcf', 'invalid', filename);
        expect(fs.existsSync(filepath)).toBeTruthy();

        const mockError = jest.fn(x => x);

        const vcf = require('../lib/vcf')();
        expect(vcf.parser).toBeUndefined();

        return await new Promise(function(resolve) {
            vcf.read(filepath)
                .on('error', mockError)
                .on('end', () => resolve());
        }).then(() => {
            expect(mockError).toHaveBeenCalledTimes(numErrors);
        });
    });

    test.each(invalid_files)('.from stream of file "%s"', async function(filename, numErrors) {
        const filepath = path.join(__dirname, 'assets', 'vcf', 'invalid', filename);
        expect(fs.existsSync(filepath)).toBeTruthy();

        const mockError = jest.fn(x => x);

        const vcf = require('../lib/vcf')();
        expect(vcf.parser).toBeUndefined();

        return await new Promise(function(resolve) {
            const stream = fs.createReadStream(filepath);
            vcf.readStream(stream)
                .on('error', mockError)
                .on('end', () => resolve());
        }).then(() => {
            expect(mockError).toHaveBeenCalledTimes(numErrors);
        });
    });
});

describe('parse without error', function() {
    test.each([
        'no_genotypes.vcf',
        'no_samples.vcf',
        'only_mandatory.vcf'
    ])('.from file "%s"', async function(filename) {
        const filepath = path.join(__dirname, 'assets', 'vcf', 'valid', filename);
        expect(fs.existsSync(filepath)).toBeTruthy();

        const mockError = jest.fn(x => x);

        const vcf = require('../lib/vcf')();
        expect(vcf.parser).toBeUndefined();

        return await new Promise(function(resolve) {
            vcf.read(filepath)
                .on('error', mockError)
                .on('end', () => resolve());
        }).then(() => {
            expect(vcf.parser.format).not.toBe('');
            expect(mockError).not.toHaveBeenCalled();
        });
    });

    test.each([
        'no_genotypes.vcf',
        'no_samples.vcf',
        'only_mandatory.vcf'
    ])('.from stream of file "%s"', async function(filename) {
        const filepath = path.join(__dirname, 'assets', 'vcf', 'valid', filename);
        expect(fs.existsSync(filepath)).toBeTruthy();

        const mockError = jest.fn(x => x);

        const vcf = require('../lib/vcf')();
        expect(vcf.parser).toBeUndefined();

        return await new Promise(function(resolve) {
            const stream = fs.createReadStream(filepath);
            vcf.readStream(stream)
                .on('error', mockError)
                .on('end', () => resolve());
        }).then(() => {
            expect(vcf.parser.format).not.toBe('');
            expect(mockError).not.toHaveBeenCalled();
        });
    });
});
