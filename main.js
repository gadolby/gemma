// Copyright 2018 Greer Dolby, Douglas G. Moore. All rights reserved.
// Use of this source code is governed by a MIT
// license that can be found in the LICENSE file.
const program = require('commander');

program
    .version('0.0.0')
    .command('import [filename]')
    .description('Import VCF file into database')
    .action(function(filename) {
        console.log('filename: ' + filename);
    });

program.on('command:*', function() {
    console.error(program.helpInformation());
    process.exit(1);
});

program.parse(process.argv);

if (process.argv.length == 2) {
    console.error(program.helpInformation());
    process.exit(1);
}