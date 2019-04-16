const ParserAPI = require('./parserapi');

const Parser = function(filepath) {
    let lineNumber = 0;

    let foundFASTA = false;
    let errorState = false;

    return Object.create({
        version: {},
        metadata: {},

        line(line) {
            lineNumber += 1;
            line = line.trim();
            if (line.length !== 0 && !foundFASTA && !errorState) {
                if (lineNumber === 1) {
                    return this.fileFormat(line);
                } else if (line === '##FASTA') {
                    foundFASTA = true;
                    return;
                } else if (line[0] === '#') {
                    return;
                } else {
                    return this.data(line);
                }
            }
        },

        fileFormat(line) {
            if (line.substr(0,13) !== '##gff-version') {
                this.fatal('first line must be GFF version, e.g. "##gff-version X.Y.Z"', line);
            }
            const version = line.substr(14).split('.').map(d => parseInt(d));
            if (version.some(isNaN)) {
                this.fatal(`invalid format line: version is not numeric`, line);
            }
            this.version.standard = version[0];
            if (version[1] !== undefined) {
                this.version.major = version[1];
            }
            if (version[2] !== undefined) {
                this.version.minor = version[2];
            }
        },

        data(line) {
            const columns = line.split('\t');
            if (columns.length < 9) {
                this.fatal(`missing ${9 - columns.length} columns`, line);
            } else if (columns.length > 9) {
                this.error(`found ${columns.length - 9} columns`, line);
            }
            const datum = {
                seqid: this.parseSeqID(columns[0], line),
                source: this.parseSource(columns[1], line),
                type: this.parseType(columns[2], line),
                start: this.parseStart(columns[3], line),
                end: this.parseEnd(columns[4], line),
                score: this.parseScore(columns[5], line),
                strand: this.parseStrand(columns[6], line),
                phase: this.parsePhase(columns[7], line)
            };
            const attributes = {};
            for (let attribute of columns[8].split(';')) {
                if (attribute.length !== 0) {
                    const [tag, value] = this.parseAttribute(attribute, line);
                    if (attributes[tag] !== undefined) {
                        this.error(`duplicate attribute ${tag}`, line);
                    }
                    attributes[tag] = value;
                }
            }
            datum['attributes'] = attributes;

            return this.validate(datum);
        },

        parseSeqID: (field) => field,

        parseSource(field, line) {
            if (field.length === 0) {
                this.error(`source is missing`, line);
            }
            return field;
        },

        parseType(field, line) {
            if (field.length === 0) {
                this.error(`type is missing`, line);
            }
            return field;
        },

        parseStart(field, line) {
            const start = parseInt(field);
            if (isNaN(start)) {
                this.error(`start value is not a number, got "${field}"`, line);
            } else if (start < 1) {
                this.error(`start value is less than 1, got "${start}"`, line);
            }
            return start;
        },

        parseEnd(field, line) {
            const end = parseInt(field);
            if (isNaN(end)) {
                this.error(`end value is not a number, got "${field}"`, line);
            } else if (end < 1) {
                this.error(`end value is less than 1, got "${end}"`, line);
            }
            return end;
        },

        parseScore(field, line) {
            const score = (field === '.') ? field : parseInt(field);
            if (score !== '.' && isNaN(score)) {
                this.error(`score is not a number, got "${field}"`, line);
            }
            return score;
        },

        parseStrand(field, line) {
            switch(field) {
            case '+': break;
            case '-': break;
            case '.': break;
            case '?': break;
            default:
                this.error(`strand should be "+", "-", "." or "?", got "${field}"`, line);
            }
            return field;
        },

        parsePhase(field, line) {
            const phase = (field === '.') ? field : parseInt(field);
            if (phase !== '.') {
                if (isNaN(phase)) {
                    this.error(`phase is not a number, got "${field}"`, line);
                } else if (phase !== 0 && phase !== 1 && phase !== 2) {
                    this.error(`phase should be 0, 1, 2 or '.', got "${phase}"`, line);
                }
            }
            return phase;
        },

        parseAttribute(attribute, line) {
            const parts = attribute.split('=');
            if (parts.length !== 2) {
                this.error(`attribute "${attribute}" is illformed; should be Tag=Value`, line);
            } else if (parts[0].length === 0) {
                this.error(`attribute "${attribute}" is missing a name; should be Tag=Value`, line);
            }
            return parts;
        },

        validate(datum, line) {
            if (datum.end < datum.start) {
                const msg = 'feature\'s end is less than it\'s start: '
                    + `start=${datum.start}, end=${datum.end}`;
                this.error(msg, line);
            }

            if (datum.attributes.ID === undefined) {
                this.error('feature is missing the "ID" attribute', line);
            }

            return datum;
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

module.exports = ParserAPI(Parser);
