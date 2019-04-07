const fs = require('fs-extra');
const readline = require('readline');
const events = require('events');

const Parser = function(filepath) {
    let lineNumber = 0;

    let errorState = false;

    return Object.create({
        line(line) {
            lineNumber += 1;
            line = line.trim();
            if (line.length !== 0 && !errorState) {
                return this.data(line);
            }
        },

        data(line) {
            return line;
        },

        fatal(msg, line) {
            errorState = true;
            this.error(msg, line);
        },

        error(msg, line) {
            msg = msg + '\n\t"' + line + '"';
            throw new Error(filepath + ':' + lineNumber + ' - ' + msg);
        }
    });
};

module.exports = function() {
    const gff = new events.EventEmitter();

    gff.readStream = function(instream, filepath='<stream>') {
        this.parser = Parser(filepath);
        this.rl = readline.createInterface(instream);

        this.rl.on('line', (line) => {
            try {
                const data = this.parser.line(line);
                if (data) {
                    gff.emit('data', data);
                }
            } catch (err) {
                gff.emit('error', err);
            }
        });

        this.rl.on('close', () => gff.emit('end'));

        return this;
    };

    gff.read = (filepath) => gff.readStream(fs.createReadStream(filepath), filepath);

    gff.pause = function() {
        this.rl && this.rl.pause();
    };

    gff.resume = function() {
        this.rl && this.rl.resume();
    };

    return gff;
};
