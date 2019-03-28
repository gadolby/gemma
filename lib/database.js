const sqlite = require('sqlite');

const is_snp = function(alt) {
    const a = alt.toUpperCase();
    return ['A','T','C','G'].find(b => a === b) !== undefined;
};

module.exports.Database = async function(filename) {
    let db = await sqlite.open(filename, { verbose: true });

    await Promise.all([
        db.run('pragma synchronous = OFF'),
        db.run('pragma journal_mode = MEMORY'),
        db.run('CREATE TABLE IF NOT EXISTS alternates (AlternateID int, Chromosome string, Position int, Alternate string, SNP int, PRIMARY KEY (AlternateID, Chromosome, Position))'),
        db.run('CREATE TABLE IF NOT EXISTS variants (SampleID string, Chromosome string, Position int, ChromosomeCopy int, AlternateID int, PRIMARY KEY (SampleID, Chromosome, Position, ChromosomeCopy))'),
        db.run('CREATE TABLE IF NOT EXISTS environment (SampleID string, Name string, Value string, PRIMARY KEY (SampleID, Name))'),
        db.run('CREATE TABLE IF NOT EXISTS genes (GeneID string, Source string, Start int, End int, Note string, PRIMARY KEY (GeneID))'),
        db.run('CREATE TABLE IF NOT EXISTS subgenes (GeneID string, ID string, Source string, Type string, Start int, End int, Note string)')
    ]);

    let close = () => db.close();

    let insert_alternates = async function(entry) {
        let query = 'INSERT INTO alternates (AlternateID, Chromosome, Position, Alternate, SNP) VALUES (?,?,?,?,?)';

        let promises = [db.run(query, 0, entry.chrom, entry.pos, entry.ref, 0)];
        entry.alt.forEach(function(alt, i) {
            promises.push(db.run(query, i + 1, entry.chrom, entry.pos, alt, is_snp(alt)));
        });
        return Promise.all(promises);
    };

    let insert_variants = async function(entry) {
        let query = 'INSERT INTO variants (SampleID, Chromosome, Position, ChromosomeCopy, AlternateID) VALUES (?,?,?,?,?)';
        let promises = [];
        entry.sampleinfo.forEach(function(variant) {
            variant.GT.forEach(function(v, j) {
                let alt = (v === '.') ? null : v;
                promises.push(db.run(query, variant.name, entry.chrom, entry.pos, j + 1, alt));
            });
        });
        return Promise.all(promises);
    };

    let insert_entry = async function(entry) {
        return Promise.all([ insert_alternates(entry), insert_variants(entry) ]);
    };

    let insert_environment = async function(env) {
        let query = 'INSERT INTO environment (SampleID, Name, Value) VALUES (?,?,?)';
        let promises = [];
        for (let sampleid in env) {
            let data = env[sampleid];
            for (let name in data) {
                let value = (data[name].length === 0) ? null : data[name];
                promises.push(db.run(query, sampleid, name, value));
            }
        }
        return Promise.all(promises);
    };

    let insert_gene = async function(entry) {
        let query = 'INSERT INTO genes (GeneID, Source, Start, End, Note) VALUES (?,?,?,?,?)';
        const { ID, Note } = entry.attributes;
        return db.run(query, ID, entry.source, entry.start, entry.end, Note);
    };

    let insert_subgene = async function(entry) {
        let query = 'INSERT INTO subgenes (GeneID, ID, Source, Type, Start, End, Note) VALUES (?,?,?,?,?,?,?)';
        const { Parent, ID, Note } = entry.attributes;
        return db.run(query, Parent, ID, entry.source, entry.type, entry.start, entry.end, Note);
    };

    let insert_gene_feature = async function(entry) {
        if (entry.type.toLowerCase() === 'gene') {
            return insert_gene(entry);
        } else {
            return insert_subgene(entry);
        }
    };

    let list = async function(table, column, { distinct = false } = {}) {
        let query = `SELECT ${distinct ? 'DISTINCT' : ''} ${column} FROM ${table}`;
        return db.all(query).then(data => data.map(entry => entry[column]));
    };

    let query = async function(sid, chr, pos) {
        let query = 'SELECT ChromosomeCopy, Alternate, Name, Value FROM variants NATURAL JOIN alternates NATURAL JOIN environment where SampleID=? AND Chromosome=? AND Position=?';

        return db.all(query, sid, chr, pos).then(function(entries) {
            if (entries !== undefined && entries.length !== 0) {
                let result = {
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

    return Object.create({
        get handle() {
            return db;
        },

        close, insert_entry, insert_environment, insert_gene_feature, list, query
    });
};
