const VCF = require('../lib/vcf');
const fs = require('fs-extra');
const path = require('path');

const vcfPath = path.join(__dirname, 'assets', 'vcf');
const invalidVCFPath = path.join(vcfPath, 'invalid');
const validVCFPath = path.join(vcfPath, 'valid');

describe('throws for invalid vcf', function() {
    const invalidVCFs = fs.readdirSync(invalidVCFPath);
    const invalidVCFsWithVCFExt = invalidVCFs.filter(f => path.extname(f) === '.vcf');

    test.each(invalidVCFs)('.from file "%s"', async function(filename) {
        const filepath = path.join(invalidVCFPath, filename);
        expect(fs.existsSync(filepath)).toBeTruthy();

        const mockError = jest.fn(x => x);

        const vcf = VCF();
        expect(vcf.parser).toBeUndefined();

        return await new Promise(function(resolve) {
            try {
                vcf.read(filepath)
                    .on('error', mockError)
                    .on('end', () => resolve());
            } catch (err) {
                resolve(mockError(err));
            }
        }).then(() => {
            expect(mockError).toHaveBeenCalled();
        });
    });

    test.each(invalidVCFsWithVCFExt)('.from stream of file "%s"', async function(filename) {
        const filepath = path.join(invalidVCFPath, filename);
        expect(fs.existsSync(filepath)).toBeTruthy();

        const mockError = jest.fn(x => x);

        const vcf = VCF();
        expect(vcf.parser).toBeUndefined();

        return await new Promise(function(resolve) {
            const stream = fs.createReadStream(filepath);
            vcf.readStream(stream)
                .on('error', mockError)
                .on('end', () => resolve());
        }).then(() => {
            expect(mockError).toHaveBeenCalled();
        });
    });
});

describe('parse without error', function() {
    const validVCFs = fs.readdirSync(validVCFPath);
    const validVCFsWithVCFExt = validVCFs.filter(f => path.extname(f) === '.vcf');

    test.each(validVCFs)('.from file "%s"', async function(filename) {
        const filepath = path.join(validVCFPath, filename);
        expect(fs.existsSync(filepath)).toBeTruthy();

        const mockError = jest.fn(x => x);

        const vcf = VCF();
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

    test.each(validVCFsWithVCFExt)('.from stream of file "%s"', async function(filename) {
        const filepath = path.join(validVCFPath, filename);
        expect(fs.existsSync(filepath)).toBeTruthy();

        const mockError = jest.fn(x => x);

        const vcf = VCF();
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
