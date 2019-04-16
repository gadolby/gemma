const events = require('events');
const fs = require('fs-extra');
const path = require('path');
const readline = require('readline');
const zlib = require('zlib');

module.exports = function(extension, parser) {
    return function() {
        const emitter = new events.EventEmitter();

        emitter.readStream = function(instream, filepath='<stream>') {
            this.parser = parser(filepath);
            this.rl = readline.createInterface(instream);

            this.rl.on('line', (line) => {
                try {
                    const data = this.parser.line(line);
                    if (data) {
                        emitter.emit('data', data);
                    }
                } catch (err) {
                    emitter.emit('error', err);
                }
            });

            this.rl.on('close', () => emitter.emit('end'));

            return this;
        };

        emitter.read = function(filepath) {
            const ext = path.extname(filepath);
            const stream = fs.createReadStream(filepath);
            switch(ext) {
            case '.gz':
                return emitter.readStream(stream.pipe(zlib.createGunzip()), filepath);
            case extension:
                return emitter.readStream(stream, filepath);
            default:
                throw new Error(`unrecognized for file ${filepath}; `
                    + `got "${ext}", expected "${extension}"`);
            }
        };

        emitter.pause = function() {
            this.rl && this.rl.pause();
        };

        emitter.resume = function() {
            this.rl && this.rl.resume();
        };

        return emitter;
    };
};
