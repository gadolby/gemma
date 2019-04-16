const fs = require('fs-extra');
const readline = require('readline');
const events = require('events');

module.exports = function(parser) {
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

        emitter.read = (filepath) => emitter.readStream(fs.createReadStream(filepath), filepath);

        emitter.pause = function() {
            this.rl && this.rl.pause();
        };

        emitter.resume = function() {
            this.rl && this.rl.resume();
        };

        return emitter;
    };
};
