const chalk = require('chalk');
const gemma = require('../lib');
const program = require('commander');

const last = (arr) => arr[arr.length - 1];

const whiteSpace = (w) => new Array(w).fill(' ').join('');

const table = function(heading, data) {
    const hlen = heading.length;
    const dlen = Math.max(...data.map(d => d.length));
    const width = Math.max(hlen, dlen);
    const hlPadWidth = Math.floor((width - hlen) / 2);

    const hlPad = whiteSpace(hlPadWidth);
    const hrPad = whiteSpace(width - hlen - hlPadWidth);
    const dPad = whiteSpace(Math.floor((width - dlen) / 2));

    process.stdout.write(chalk.underline(hlPad + heading + hrPad) + '\n\n');
    data.forEach(function(row) {
        process.stdout.write(`${dPad}${row}\n`);
    });
};

const collectOpts = function(cmd, ...keys) {
    let opts = {
        database: cmd.parent.database
    };
    keys.forEach(k => opts[k] = cmd[k]);
    return opts;
};

program
    .version('0.0.0', '-v, --version')
    .option('-d, --database <filename>', 'Database filename', './gemma.db');

program
    .command('import-vcf <vcf-filename>')
    .alias('iv')
    .description('Import a VCF file into database')
    .action(function(filename, cmd) {
        process.stdout.write(`Importing VCF file ${filename}...`);
        gemma.import.vcf(filename, collectOpts(cmd))
            .then(n => process.stdout.write(` done. (${n} entries)`));
    });

program
    .command('import-env <csv-filename>')
    .alias('ie')
    .description('Import environmental data into database')
    .action(function(filename, cmd) {
        process.stdout.write(`Importing environment variables from ${filename}...`);
        gemma.import.env(filename, collectOpts(cmd))
            .then(() => process.stdout.write(' done.'));
    });

program
    .command('import-gff <gff-filename>')
    .alias('ig')
    .description('Import features from a GFF file into database')
    .action(function(filename, cmd) {
        process.stdout.write(`Importing GFF file ${filename}...`);
        gemma.import.gff(filename, collectOpts(cmd))
            .then(n => process.stdout.write(` done. (${n} entries)`));
    });

program
    .command('list-samples')
    .alias('lss')
    .description('List the distinct sample IDs')
    .action(function(...args) {
        gemma.query.listSamples(collectOpts(last(args)))
            .then(samples => table('Samples', samples));
    });

program
    .command('list-chromosomes')
    .alias('lsc')
    .description('List the distinct chromosomes')
    .action(function(...args) {
        gemma.query.listChromosomes(collectOpts(last(args)))
            .then(chromo => table('Chromosomes', chromo));
    });

program.on('command:*', function() {
    process.stdout.write(program.helpInformation() + '\n');
    process.exit(1);
});

program.parse(process.argv);

if (process.argv.length == 2) {
    process.stderr.write(program.helpInformation() + '\n');
    process.exit(1);
}

process.on('unhandledRejection', function(err) {
    process.stderr.write(err.stack + '\n');
    process.exit(1);
});
