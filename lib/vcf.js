const fs = require('fs-extra');
const readline = require('readline');
const events = require('events');

const Parser = function(filepath) {
    const bases = new Set('ATCGatcg');
    const mandatoryColumns = ['CHROM', 'POS', 'ID', 'REF', 'ALT', 'QUAL', 'FILTER', 'INFO'];

    let lineNumber = 0;
    let fileFormat = '';
    let headerSeenOn = 0;
    let allColumns = undefined;
    let fixedColumns = undefined;
    let formatColumn = undefined;
    let sampleIDs = undefined;
    let columnIndices = {};

    let ploidy = undefined;

    let errorState = false;

    return Object.create({
        get format() {
            return fileFormat;
        },

        line(line) {
            lineNumber += 1;
            line = line.trim();
            if (line.length !== 0 && !errorState) {
                if (lineNumber === 1) {
                    return this.fileFormat(line);
                } else if (line.substr(0,2) === '##') {
                    return this.metadata(line);
                } else if (line[0] === '#') {
                    return this.header(line);
                } else {
                    return this.data(line);
                }
            }
        },

        fileFormat(line) {
            if (line.substr(2,10) === 'fileformat') {
                fileFormat = line.substr(13);
            } else {
                this.fatal('invalid file format line', line);
            }
        },

        metadata() { },

        header(line) {
            if (headerSeenOn) {
                const msg ='multiple headers seen on lines ' + headerSeenOn + ' and ' + lineNumber;
                this.fatal(msg, line);
            } else {
                headerSeenOn = lineNumber;
                allColumns = line.substr(1).split('\t');
                if (allColumns.length < mandatoryColumns.length) {
                    this.fatal('missing at least one manditory header column', line);
                } else if (allColumns.length === mandatoryColumns.length) {
                    fixedColumns = allColumns.slice();
                } else {
                    fixedColumns = allColumns.slice(0, mandatoryColumns.length);
                    formatColumn = allColumns[mandatoryColumns.length];
                    sampleIDs = allColumns.slice(mandatoryColumns.length + 1);
                }

                const fixed = new Set(fixedColumns);
                if (fixed.size !== fixedColumns.length) {
                    this.fatal('at least one manditory header column is duplicated', line);
                }
                for (let column of mandatoryColumns) {
                    if (!fixed.has(column)) {
                        this.fatal(`the manditory column ${column} is missing`, line);
                    }
                }

                if (formatColumn !== undefined && formatColumn !== 'FORMAT') {
                    const msg = `expected ninth column to be 'FORMAT', got ${formatColumn}`;
                    this.fatal(msg, line);
                }

                if (sampleIDs !== undefined && sampleIDs.length !== (new Set(sampleIDs)).size) {
                    this.fatal('at least one sampleID is duplicated', line);
                }

                for (let i = 0, len = allColumns.length; i < len; ++i) {
                    columnIndices[allColumns[i]] = i;
                }
            }
        },

        data(line) {
            const columns = line.split('\t');
            if (columns.length !== allColumns.length) {
                this.error(`expected ${allColumns.length} columns, got ${columns.length}`, line);
            }

            let data = { };

            for (let i = 0, len = fixedColumns.length; i < len; ++i) {
                data[fixedColumns[i].toLowerCase()] = columns[i];
            }

            data.alt = columns[columnIndices['ALT']].split(',');

            data.info = {};
            const infoFields = columns[columnIndices['INFO']].split(';');
            for (let i = 0, len = infoFields.length; i < len; ++i) {
                const [key, val, ...other] = infoFields[i].split('=');
                if (other.length !== 0) {
                    this.error('illformed info field, possibly missing a semicolon', line);
                } else if (val) {
                    data.info[key] = val;
                } else {
                    data.info.flags = (data.info.flags || []).concat(key);
                }
            }

            data.sampleinfo = [];
            if (sampleIDs) {
                const formatTags = columns[columnIndices[formatColumn]].split(':');
                for (let i = 0, len = sampleIDs.length; i < len; ++i) {
                    const name = sampleIDs[i];
                    let sample = { name };
                    let parts = columns[columnIndices[name]].split(':');
                    if (parts.length !== formatTags.length) {
                        const msg = `parts for sample "${name}" inconsistent with expected format`;
                        this.error(msg, line);
                    }
                    for (let j = 0, len = parts.length; j < len; ++j) {
                        sample[formatTags[j]] = parts[j];
                    }
                    if (sample.GT !== undefined) {
                        sample.GT = sample.GT.split('/').map(x => (x === '.') ? x : parseInt(x));
                        for (let gt of sample.GT) {
                            if (gt !== '.' && (isNaN(gt) || gt < 0 || gt > data.alt.length)) {
                                this.error(`sample ${name} has a genotype out of range`, line);
                            }
                        }
                        if (ploidy === undefined) {
                            ploidy = sample.GT.length;
                        } else if (sample.GT.length !== ploidy) {
                            const msg = `sample ${name} has unexpected ploidy ${sample.GT.length}`
                                + ` expected ${ploidy} based on preceeding samples`;
                            this.error(msg, line);
                        }
                    }
                    data.sampleinfo.push(sample);
                }
            }

            if (data.ref.split('').some(x => !bases.has(x))) {
                this.error(`reference (${data.ref}) has an invalid base`, line);
            }
            for (let i = 0, len = data.alt.length; i < len; ++i) {
                const alt = data.alt[i];
                const bs = alt.split('');
                if (alt !== '*' && (bs.length === 0 || bs.some(x => !bases.has(x)))) {
                    this.error(`alternate ${i} (${alt}) has an invalid base`, line);
                }
            }

            return data;
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
    const vcf = new events.EventEmitter();

    vcf.readStream = function(instream, filepath='<stream>') {
        this.parser = Parser(filepath);
        const rl = readline.createInterface(instream);

        rl.on('line', (line) => {
            try {
                const data = this.parser.line(line);
                if (data) {
                    vcf.emit('data', data);
                }
            } catch (err) {
                vcf.emit('error', err);
            }
        });

        rl.on('close', () => vcf.emit('end'));

        return this;
    };

    vcf.read = (filepath) => vcf.readStream(fs.createReadStream(filepath), filepath);

    return vcf;
};
