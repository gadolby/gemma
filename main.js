const program = require('commander');
const gemma = {
    import: require('./src/import'),
    query: require('./src/query')
};

program.version('0.0.0', '-v, --version');

program
    .command('import-vcf <vcf-filename>')
    .alias('iv')
    .option('-d, --database <filename>', 'Database filename', './gemma.db')
    .description('Import a VCF file into database')
    .action(gemma.import.vcf);

program
    .command('import-env <csv-filename>')
    .alias('ie')
    .option('-d, --database <filename>', 'Database filename', './gemma.db')
    .description('Import environmental data into database')
    .action(gemma.import.env);

program
    .command('import-gff <gff-filename>')
    .alias('ig')
    .option('-d, --database <filename>', 'Database filename', './gemma.db')
    .description('Import features from a GFF file into database')
    .action(gemma.import.gff);

program
    .command('list-samples')
    .alias('lss')
    .option('-d, --database <filename>', 'Database filename', './gemma.db')
    .description('List the distinct sample IDs')
    .action(gemma.query.listSamples);

program
    .command('list-chromosomes')
    .alias('lsc')
    .option('-d, --database <filename>', 'Database filename', './gemma.db')
    .description('List the distinct chromosomes')
    .action(gemma.query.listChromosomes);

program
    .command('query <sampleid> <chromosome> <position>')
    .alias('q')
    .option('-d, --database <filename>', 'Database filename', './gemma.db')
    .description('Query the database for entries')
    .action(gemma.query.query);

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
