const chalk = require('chalk');
const gemma = require('../lib');
const program = require('commander');

const last = (arr) => arr[arr.length - 1];

const whiteSpace = (w) => new Array(w).fill(' ').join('');

const table = function(heading, data) {
    const hlen = heading.length;
    const dlen = Math.max(0, ...data.map(d => d.length));
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
    let opts = Object.assign({}, cmd.parent);
    keys.forEach(k => opts[k] = cmd[k]);
    return opts;
};

program
    .version('0.0.0', '-v, --version')
    .option('-d, --database <filename>', 'Database filename', './gemma.db')
    .option('-s, --silent', 'Generate no non-essential logging')
    .option('--no-color', 'Do not colorize output');

program
    .command('import-vcf <vcf-filename>')
    .alias('iv')
    .description('Import a VCF file into database')
    .action(function(filename, cmd) {
        cmd = collectOpts(cmd);
        cmd.silent || process.stdout.write(`Importing VCF file ${filename}...`);
        gemma.import.vcf(filename, cmd)
            .then(n => cmd.silent || process.stdout.write(` done. (${n} entries)`));
    });

program
    .command('import-env <csv-filename>')
    .alias('ie')
    .description('Import environmental data into database')
    .action(function(filename, cmd) {
        cmd = collectOpts(cmd);
        cmd.silent || process.stdout.write(`Importing environment variables from ${filename}...`);
        gemma.import.env(filename, cmd)
            .then(() => cmd.silent || process.stdout.write(' done.'));
    });

program
    .command('import-gff <gff-filename>')
    .alias('ig')
    .description('Import features from a GFF file into database')
    .action(function(filename, cmd) {
        cmd = collectOpts(cmd);
        cmd.silent || process.stdout.write(`Importing GFF file ${filename}...`);
        gemma.import.gff(filename, cmd)
            .then(n => cmd.silent || process.stdout.write(` done. (${n} entries)`));
    });

program
    .command('list-samples')
    .alias('lss')
    .description('List the distinct sample IDs')
    .action(async function(...args) {
        const cmd = collectOpts(last(args));
        const samples = await gemma.query.listSamples(cmd);
        if (samples.length) {
            table('Samples', samples);
        } else {
            process.stdout.write(chalk.red.bold('no samples found'));
        }
    });

program
    .command('list-chromosomes')
    .alias('lsc')
    .description('List the distinct chromosomes')
    .action(async function(...args) {
        const cmd = collectOpts(last(args));
        const chromosomes = gemma.query.listChromosomes(cmd);
        if (chromosomes.length) {
            table('Chromosomes', chromosomes);
        } else {
            process.stdout.write(chalk.red.bold('no chromosomes found'));
        }
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
