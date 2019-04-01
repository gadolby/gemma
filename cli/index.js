// # gemma

const chalk = require('chalk');
const gemma = require('../lib');
const program = require('commander');
const signale = require('signale');
const util = require('./util');

program
    .version('0.0.0', '-v, --version')
    .option('-d, --database <filename>', 'Database filename', './gemma.db')
    .option('-s, --silent', 'Generate no non-essential logging')
    .option('--no-color', 'Do not colorize output');

program
    .command('import-vcf <vcf-filename>')
    .alias('iv')
    .description('Import a VCF file into database')
    .option('-a, --append', 'Append data to the database')
    .action(function(filename, cmd) {
        cmd = util.collectOpts(cmd, 'append');
        cmd.silent || signale.await(`Importing VCF file ${filename}`);
        gemma.import.vcf(filename, cmd)
            .then(n => cmd.silent || signale.complete(`${n} VCF entries imported`))
            .catch(function(err) {
                if (err.code && err.code === 'SQLITE_CONSTRAINT') {
                    signale.error('An entry in the VCF has already been imported into the database');
                } else {
                    signale.error(err);
                }
            });
    });

program
    .command('import-env <csv-filename>')
    .alias('ie')
    .description('Import environmental data into database')
    .option('-a, --append', 'Append data to the database')
    .action(function(filename, cmd) {
        cmd = util.collectOpts(cmd, 'append');
        cmd.silent || signale.await(`Importing environment variables from ${filename}`);
        gemma.import.env(filename, cmd)
            .then(() => cmd.silent || signale.complete('environment imported'))
            .catch(function(err) {
                if (err.code && err.code === 'SQLITE_CONSTRAINT') {
                    signale.error('An environment variable has already been imported into the database');
                } else {
                    signale.error(err);
                }
            });
    });

program
    .command('import-gff <gff-filename>')
    .alias('ig')
    .description('Import features from a GFF file into database')
    .action(function(filename, cmd) {
        cmd = util.collectOpts(cmd);
        cmd.silent || signale.await(`Importing GFF file ${filename}`);
        gemma.import.gff(filename, cmd)
            .then(n => cmd.silent || signale.complete(`${n} GFF entries imported`))
            .catch(err => signale.error(err));
    });

program
    .command('list-samples')
    .alias('lss')
    .description('List the distinct sample IDs')
    .action(async function(...args) {
        const cmd = util.collectOpts(util.last(args));
        const samples = await gemma.query.listSamples(cmd);
        if (samples.length) {
            samples.forEach(s => process.stdout.write(s + '\n'));
        } else {
            process.stdout.write(chalk.red.bold('no samples found'));
        }
    });

program
    .command('list-chromosomes')
    .alias('lsc')
    .description('List the distinct chromosomes')
    .action(async function(...args) {
        const cmd = util.collectOpts(util.last(args));
        const chromosomes = await gemma.query.listChromosomes(cmd);
        if (chromosomes.length) {
            chromosomes.forEach(c => process.stdout.write(c + '\n'));
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
