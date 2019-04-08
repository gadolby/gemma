const fs = require('fs-extra');
const path = require('path');
const GFF = require('../lib/gff');

const gffPath = path.join(__dirname, 'assets', 'gff');
const invalidGFFPath = path.join(gffPath, 'invalid');
const validGFFPath = path.join(gffPath, 'valid');

describe('throws for invalid gff', function() {
    const invalidGFFs = fs.readdirSync(invalidGFFPath);
    test.each(invalidGFFs)('.from file "%s"', async function(filename) {
        const filepath = path.join(invalidGFFPath, filename);
        expect(fs.existsSync(filepath)).toBeTruthy();

        const mockError = jest.fn(x => x);

        const gff = GFF();
        expect(gff.parser).toBeUndefined();

        return await new Promise(function(resolve) {
            gff.read(filepath)
                .on('error', mockError)
                .on('end', () => resolve());
        }).then(() => {
            expect(mockError).toHaveBeenCalled();
        });
    });

    test.each(invalidGFFs)('.from stream of file "%s"', async function(filename) {
        const filepath = path.join(invalidGFFPath, filename);
        expect(fs.existsSync(filepath)).toBeTruthy();

        const mockError = jest.fn(x => x);

        const gff = GFF();
        expect(gff.parser).toBeUndefined();

        return await new Promise(function(resolve) {
            const stream = fs.createReadStream(filepath);
            gff.readStream(stream)
                .on('error', mockError)
                .on('end', () => resolve());
        }).then(() => {
            expect(mockError).toHaveBeenCalled();
        });
    });
});

describe('parse without error', function() {
    const validGFFs = fs.readdirSync(validGFFPath);
    test.each(validGFFs)('.from file "%s"', async function(filename) {
        const filepath = path.join(validGFFPath, filename);
        expect(fs.existsSync(filepath)).toBeTruthy();

        const mockError = jest.fn(x => x);

        const gff = GFF();
        expect(gff.parser).toBeUndefined();

        return await new Promise(function(resolve) {
            gff.read(filepath)
                .on('error', mockError)
                .on('end', () => resolve());
        }).then(() => {
            expect(mockError).not.toHaveBeenCalled();
        });
    });

    test.each(validGFFs)('.from stream of file "%s"', async function(filename) {
        const filepath = path.join(validGFFPath, filename);
        expect(fs.existsSync(filepath)).toBeTruthy();

        const mockError = jest.fn(x => x);

        const gff = require('../lib/gff')();
        expect(gff.parser).toBeUndefined();

        return await new Promise(function(resolve) {
            const stream = fs.createReadStream(filepath);
            gff.readStream(stream)
                .on('error', mockError)
                .on('end', () => resolve());
        }).then(() => {
            expect(mockError).not.toHaveBeenCalled();
        });
    });
});
