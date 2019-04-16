const GFF = require('../lib/gff');
const fs = require('fs-extra');
const path = require('path');

const gffPath = path.join(__dirname, 'assets', 'gff');
const invalidGFFPath = path.join(gffPath, 'invalid');
const validGFFPath = path.join(gffPath, 'valid');

describe('throws for invalid gff', function() {
    const invalidGFFs = fs.readdirSync(invalidGFFPath);
    const invalidGFFsWithGFFExt = invalidGFFs.filter(f => path.extname(f) === '.gff');

    test.each(invalidGFFs)('.from file "%s"', async function(filename) {
        const filepath = path.join(invalidGFFPath, filename);
        expect(fs.existsSync(filepath)).toBeTruthy();

        const mockError = jest.fn(x => x);

        const gff = GFF();
        expect(gff.parser).toBeUndefined();

        return await new Promise(function(resolve) {
            try {
                gff.read(filepath)
                    .on('error', mockError)
                    .on('end', () => resolve());
            } catch (err) {
                resolve(mockError(err));
            }
        }).then(() => {
            expect(mockError).toHaveBeenCalled();
        });
    });

    test.each(invalidGFFsWithGFFExt)('.from stream of file "%s"', async function(filename) {
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
    const validGFFsWithGFFExt = validGFFs.filter(f => path.extname(f) === '.gff');

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
            expect(gff.parser.version.standard).toBe(3);
            expect(mockError).not.toHaveBeenCalled();
        });
    });

    test.each(validGFFsWithGFFExt)('.from stream of file "%s"', async function(filename) {
        const filepath = path.join(validGFFPath, filename);
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
            expect(gff.parser.version.standard).toBe(3);
            expect(mockError).not.toHaveBeenCalled();
        });
    });
});
