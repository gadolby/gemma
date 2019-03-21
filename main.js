const program = require('commander');
const gemma = {
    import: require('./src/import'),
    query: require('./src/query')
};

program.version('0.0.0', '-v, --version');

program
    .command('import-vcf <vcf-filename>')
    .option('-d, --database <filename>', 'Database filename', './gemma.db')
    .description('Import a VCF file into database')
    .action(gemma.import.vcf);

program
    .command('import-env <csv-filename>')
    .option('-d, --database <filename>', 'Database filename', './gemma.db')
    .description('Import environmental data into database')
    .action(gemma.import.env);

program
    .command('import-gff <gff-filename>')
    .option('-d, --database <filename>', 'Database filename', './gemma.db')
    .description('Import features from a GFF file into database')
    .action(gemma.import.gff);

program
    .command('query <sampleid> <chromosome> <position>')
    .option('-d, --database <filename>', 'Database filename', './gemma.db')
    .description('Query the database for entries')
    .action(gemma.query);

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
