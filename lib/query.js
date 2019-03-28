const chalk = require('chalk');
const jdb = require('./database');

const listSamples = function(cmd) {
    return jdb.Database(cmd.database)
        .then(db => db.list('variants', 'SampleID', { distinct: true }))
        .then(function(data) {
            data.sort();
            process.stdout.write(chalk.underline(chalk.bold(data.length) + ' samples found\n\n'));
            data.forEach(entry => process.stdout.write('  ' + entry + '\n'));
        });
};

const listChromosomes = function(cmd) {
    return jdb.Database(cmd.database)
        .then(db => db.list('variants', 'Chromosome', { distinct: true }))
        .then(function(data) {
            process.stdout.write(chalk.underline(chalk.bold(data.length) + ' chromosomes found\n\n'));
            data.forEach(entry => process.stdout.write('  ' + entry + '\n'));
        });
};

module.exports = { listChromosomes, listSamples };
