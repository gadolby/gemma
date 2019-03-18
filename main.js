// Copyright 2018 Greer Dolby, Douglas G. Moore. All rights reserved.
// Use of this source code is governed by a MIT
// license that can be found in the LICENSE file.
const program = require('commander');
const jenna = {
    import: require('./src/import'),
    query: require('./src/query')
};

program.version('0.0.0', '-v, --version');

program
    .command('import-vcf <vcf-filename>')
    .option('-d, --database <filename>', 'Database filename', './jenna.db')
    .description('Import VCF file into database')
    .action(jenna.import.vcf);

program
    .command('import-env <csv-filename>')
    .option('-d, --database <filename>', 'Database filename', './jenna.db')
    .description('Import environmental data into database')
    .action(jenna.import.env);

program
    .command('query <sampleid> <chromosome> <position>')
    .option('-d, --database <filename>', 'Database filename', './jenna.db')
    .description('Query the database for entries')
    .action(jenna.query);

program.on('command:*', function() {
    process.stdout.write(program.helpInformation() + '\n');
    process.exit(1);
});

program.parse(process.argv);

if (process.argv.length == 2) {
    process.stderr.write(program.helpInformation() + '\n');
    process.exit(1);
}
