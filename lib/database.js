const sqlite = require('sqlite');

const isSNP = function(alt) {
    const a = alt.toUpperCase();
    return ['A','T','C','G'].find(b => a === b) !== undefined;
};

module.exports.Database = async function(filename) {
    const db = await sqlite.open(filename, { verbose: true });

    await Promise.all([
        db.run('pragma synchronous = OFF'),
        db.run('pragma journal_mode = MEMORY'),
        db.run('CREATE TABLE IF NOT EXISTS alternates (AlternateID int, Chromosome string, Position int, Alternate string, SNP int, PRIMARY KEY (AlternateID, Chromosome, Position))'),
        db.run('CREATE TABLE IF NOT EXISTS variants (SampleID string, Chromosome string, Position int, ChromosomeCopy int, AlternateID int, PRIMARY KEY (SampleID, Chromosome, Position, ChromosomeCopy))'),
        db.run('CREATE TABLE IF NOT EXISTS environment (SampleID string, Name string, Value string, PRIMARY KEY (SampleID, Name))'),
        db.run('CREATE TABLE IF NOT EXISTS genes (GeneID string, Source string, Start int, End int, Note string, PRIMARY KEY (GeneID))'),
        db.run('CREATE TABLE IF NOT EXISTS subgenes (GeneID string, ID string, Source string, Type string, Start int, End int, Note string)')
    ]);

    const close = () => db.close();

    const insertAlternates = async function(entry) {
        const query = 'INSERT INTO alternates (AlternateID, Chromosome, Position, Alternate, SNP) VALUES (?,?,?,?,?)';

        const promises = [db.run(query, 0, entry.chrom, entry.pos, entry.ref, 0)];
        entry.alt.forEach(function(alt, i) {
            promises.push(db.run(query, i + 1, entry.chrom, entry.pos, alt, isSNP(alt)));
        });
        return Promise.all(promises);
    };

    const insertVariants = async function(entry) {
        const query = 'INSERT INTO variants (SampleID, Chromosome, Position, ChromosomeCopy, AlternateID) VALUES (?,?,?,?,?)';
        const promises = [];
        entry.sampleinfo.forEach(function(variant) {
            variant.GT.forEach(function(v, j) {
                const alt = (v === '.') ? null : v;
                promises.push(db.run(query, variant.name, entry.chrom, entry.pos, j + 1, alt));
            });
        });
        return Promise.all(promises);
    };

    const insertVariantCall = async function(entry) {
        return Promise.all([ insertAlternates(entry), insertVariants(entry) ]);
    };

    const insertEnvironment = async function(env) {
        const query = 'INSERT INTO environment (SampleID, Name, Value) VALUES (?,?,?)';
        const promises = [];
        for (let sampleid in env) {
            const data = env[sampleid];
            for (let name in data) {
                const value = (data[name].length === 0) ? null : data[name];
                promises.push(db.run(query, sampleid, name, value));
            }
        }
        return Promise.all(promises);
    };

    const insertGene = async function(entry) {
        const query = 'INSERT INTO genes (GeneID, Source, Start, End, Note) VALUES (?,?,?,?,?)';
        const { ID, Note } = entry.attributes;
        return db.run(query, ID, entry.source, entry.start, entry.end, Note);
    };

    const insertSubgene = async function(entry) {
        const query = 'INSERT INTO subgenes (GeneID, ID, Source, Type, Start, End, Note) VALUES (?,?,?,?,?,?,?)';
        const { Parent, ID, Note } = entry.attributes;
        return db.run(query, Parent, ID, entry.source, entry.type, entry.start, entry.end, Note);
    };

    const insertGeneFeature = async function(entry) {
        if (entry.type.toLowerCase() === 'gene') {
            return insertGene(entry);
        } else {
            return insertSubgene(entry);
        }
    };

    const list = async function(table, column, { distinct = false } = {}) {
        const query = `SELECT ${distinct ? 'DISTINCT' : ''} ${column} FROM ${table}`;
        return db.all(query).then(data => data.map(entry => entry[column]));
    };

    const query = async function(sid, chr, pos) {
        const query = 'SELECT ChromosomeCopy, Alternate, Name, Value FROM variants NATURAL JOIN alternates NATURAL JOIN environment where SampleID=? AND Chromosome=? AND Position=?';

        return db.all(query, sid, chr, pos).then(function(entries) {
            if (entries !== undefined && entries.length !== 0) {
                const result = {
                    SampleId: sid,
                    Chromosome: chr,
                    Position: pos,
                    Alternates: ['.', '.'],
                    Environment: {}
                };
                entries.forEach(function(entry) {
                    result.Alternates[entry.ChromosomeCopy - 1] = entry.Alternate;
                    result.Environment[entry.Name] = entry.Value;
                });
                return result;
            } else {
                return {};
            }
        });
    };

    const isEmpty = async function(table) {
        const [n] = await db.all(`SELECT COUNT(*) FROM ${table}`);
        return n['COUNT(*)'] === 0;
    };

    return Object.create({
        get handle() {
            return db;
        },

        close, insertVariantCall, insertEnvironment, insertGeneFeature, list, query, isEmpty
    });
};
