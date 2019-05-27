#!/usr/bin/env node
/* eslint-disable no-console */
// # gemma
//
// The `gemma` command line interface provides a (hopefully) simple way for you
// to build and interact with a **Gemma** database.
//
// ## Table of Contents
//
// * [Example Usage](#example-usage)
// * [Global Options](#global-options)
// * [Import Subcommands](#import-subcommands)
// * [Querying](#querying)
// * [Searching QuickGO](#searching-quickgo)
// * [Epilog](#epilog)

// ## Example Usage
// ```shell
// λ gemma import-vcf ./data/example.vcf
// …  awaiting  Importing VCF file ./data/example.vcf
// ☒  complete  90 VCF entries imported
// ```
// ```shell
// λ gemma import-gff ./data/example.gff
// …  awaiting  Importing GFF file ./data/example.gff
// ☒  complete  99640 GFF entries imported
// ```
// ```shell
// λ gemma import-env ./data/example.csv
// …  awaiting  Importing environment variables from ./data/example.csv
// ☒  complete  environment imported
// ```
// ```shell
// λ gemma list-samples
// PM10
// PM112
// PM4
// PM5
// WSB16
// WSB161
// WSB50
// WSB57
// WSB77
// ```
// ```shell
// λ gemma list-chromosomes
// ScCC6lQ_1;HRSCAF_16
// ```
const program = require('commander');
const chalk = require('chalk');
const signale = require('signale');
const gemma = require('../lib');
const util = require('./util');

// ## Global Options
// * [--help](#help)
// * [--version](#version)
// * [--database](#database-path)
// * [--silent](#silent-mode)
// * [--no-color](#no-color)

// All of the subcommands that `gemma` provides accept and respect number of
// common options.
program
    // ### Help
    // If you do not not provide any subcommands, `gemma` will print the help
    // information
    // ```shell
    // λ gemma
    // Usage: gemma [options] [command]
    //
    // Options:
    //   -v, --version                           output the version number
    //   -d, --database <filename>               Database filename (default: "./gemma.db")
    //   -s, --silent                            Generate no non-essential logging
    //   --no-color                              Do not colorize output
    //   -h, --help                              output usage information
    //
    // Commands:
    //   import-vcf|iv [options] <vcf-filename>  Import a VCF file into database
    //   import-gff|ig <gff-filename>            Import features from a GFF file into database
    //   import-env|ie [options] <csv-filename>  Import environmental data into database
    //   list-samples|lss                        List the distinct sample IDs
    //   list-chromosomes|lsc                    List the distinct chromosomes
    //
    // ```
    //
    // ### Version
    // At any point along the way, you can print **Gemma**'s current version.
    // ```shell
    // λ gemma -v
    // 0.0.0
    // ```
    .version(util.version(), '-v, --version')
    // ### Database Path
    // By default, **Gemma**'s database will be constructed in the current
    // working directory and be named `gemma.db`. You can override this path
    // using the `-d` or `--database` option, e.g.
    // ```shell
    // λ gemma -d data/gemma.db
    // ```
    // will create or use the database `data/gemma.db` file.
    .option('-d, --database <filename>', 'Database filename', './gemma.db')
    // ### Silent Mode
    // Most subcommands, particularly the import functions, produce extra
    // logging information to let you know how things are going. If you'd like
    // to suppress that, you can provide the `-s` or `--silent` flag.
    // ```shell
    // λ gemma --silent
    // ```
    // Only error messages and the obviously desired output will be generated.
    .option('-s, --silent', 'Generate no non-essential logging')
    // ### No Color
    // We live in the 21st century which brings with it terminals that support
    // colorized output. We tried to make use of that as much as possible.
    // However, when using command line utilities from a script, you might not
    // want **Gemma**'s output to have the ASCII escape codes that facilitate
    // coloring. To suppress it, you can provide the `--no-color` option.
    // ```shell
    // λ gemma --no-color
    // ```
    // Alternatively, you can set the `FORCE_COLOR=0` in environment variable.
    // ```bash
    // λ FORCE_COLOR=0 gemma
    // ```
    .option('--no-color', 'Do not colorize output');

// ## Import Subcommands
//
// * [import-vcf](#import-vcf)
// * [import-gff](#import-gff)
// * [import-env](#import-environment)

// ### Import VCF
//
// Often the first step in the process of building your **Gemma** database will
// be to import a Variant Call Format (VCF) file. This can be done with the
// `import-vcf <vcf-filename>` subcommand.
// ```shell
// λ gemma import-vcf data/example.vcf
// …  awaiting  Importing VCF file data/example.vcf
// ☒  complete  90 VCF entries imported
// ```
program
    .command('import-vcf <vcf-filename>')
    .alias('iv')
    .description('Import a VCF file into database')
    // In the event that you call this command a second time on a given
    // database, you will get an error:
    // ```shell
    // λ gemma import-vcf data/different.vcf
    // …  awaiting  Importing VCF file ./data/example.vcf
    // ✖  error     VCF data has already been imported; rerun with --append option to force
    // ```
    // By default, **Gemma** will not let you import VCF data twice. If you
    // know that the Sample IDs, chromosomes, or positions in the VCF file you
    // are trying to import have not yet been imported, you can override this
    // block using the `-a` or `--append` flag.
    // ```shell
    // λ gemma import-vcf --append data/different.vcf
    // ```
    // **NOTE**: **Gemma** expects the sample name, chromosome name and
    // position of each variant to be unique. If you try to import duplicate
    // data with `--append`, you'll get an error:
    // ```shell
    // λ gemma import-vcf --append data/example.vcf
    // …  awaiting  Importing VCF file ./data/example.vcf
    // ✖  error     An entry in the VCF has already been imported into the database
    // ```
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

// ### Import GFF
//
// You can import a Generic Features Format (GFF) file using the `import-gff
// <gff-filename>` subcommand:
// ```shell
// λ gemma import-gff ./data/example.gff
// …  awaiting  Importing GFF file ./data/example.gff
// ☒  complete  99640 GFF entries imported
// ```
//
// Just as with the [import-vcf](#import-vcf) subcommand, `import-gff` will
// produce an error if you try to import more than one GFF file.
// ```shell
// λ gemma import-gff ./data/example.gff
// …  awaiting  Importing GFF file ./data/example.gff
// ✖  error     GFF data has already been imported; the --append option is not supported yet
// ```
// However, as the error message suggests, the `--append` option is not yet
// supported for `import-gff`. We should be adding it very soon.
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

// ### Import Environment
//
// You can import metadata (e.g. GPS coordinate, altitude, temperature, etc...)
// about the samples provided in your VCF file. These data ~~can~~ will be used
// to preform various analyses down the road. The data should be provided in
// comma-separated form (CSV) and include, at least, a `SampleID` column whose
// value corresponds to a sample in your VCF.
// ```shell
// λ gemma import-env data/example.csv
// …  awaiting  Importing environment variables from data/example.csv
// ☒  complete  environment imported
// ```
program
    .command('import-env <csv-filename>')
    .alias('ie')
    .description('Import environmental data into database')
    // Just like with [import-vcf](#import-vcf), if you call this command a
    // second time on a given database, you will get an error:
    // ```shell
    // λ gemma import-env data/example.csv
    // …  awaiting  Importing environment variables from data/example.csv
    // ✖  error     Environment data has already been imported; rerun with --append option to force
    // ```
    // The `-a` or `--append` option will allow you to import data anyway.
    // ```shell
    // λ gemma import-vcf --append data/different.vcf
    // ```
    // Again, if you try to import duplicate data with `--append`, you'll get
    // an error:
    // ```shell
    // λ gemma import-vcf --append data/example.vcf
    // …  awaiting  Importing VCF file ./data/example.vcf
    // ✖  error     An entry in the VCF has already been imported into the database
    // ```
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

// ## Querying
//
// You can query an existing **Gemma** database in a ~~number of~~ two ways.
// * [list-samples](#list-samples)
// * [list-chromosomes](#list-chromosomes)

// ### List Samples
//
// This just prints the sample IDs for all of the samples in the database, each
// on their own line.
// ```shell
// λ gemma list-samples
// PM10
// PM112
// PM4
// PM5
// WSB16
// WSB161
// WSB50
// WSB57
// WSB77
// ```
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

// ### List Chromosomes
//
// This just prints the chromosome names that exist in the database, each on
// their own line.
// ```shell
// λ gemma list-chromosomes
// ScCC6lQ_1;HRSCAF_16
// ```
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
            process.stdout.write(chalk.red.bold('no chromosomes found\n'));
        }
    });

// ## Searching QuickGo
//
// You can search the European Bioinformatics Institute's QuickGO database using **Gemma**'s command line interface. This is useful when you don't quite know what you're looking for yet. We provide, at the moment, two search methods:
// * [go-term](#go-term)
// * [go-search](#go-search)
// * [go-proteins](#go-proteins)

// ### GO Term
//
// This searches the QuickGo database for entries with a specific GO
// term ID and prints the result to the screen.
//
// ```shell
// λ gemma go-term GO:0036026
// ┌─────────┬──────────────┬────────────────────────────────────┬──────────┬──────────────────────┐
// │ (index) │      id      │                name                │ synonyms │        aspect        │
// ├─────────┼──────────────┼────────────────────────────────────┼──────────┼──────────────────────┤
// │    0    │ 'GO:0036026' │ 'protein C inhibitor-PLAT complex' │    6     │ 'cellular_component' │
// └─────────┴──────────────┴────────────────────────────────────┴──────────┴──────────────────────┘
// ```
program
    .command('go-term <goterm>')
    .description('Search the EBI gene ontology database for a specific GO term')
    .action(async function(goterm, cmd) {
        gemma.query.goTerm(goterm, cmd)
            .then(function(results) {
                if (results.length) {
                    results.forEach((result) => result.synonyms = result.synonyms.length);
                    console.table(results);
                } else {
                    const msg = `no results found for GO term ${goterm}\n`;
                    process.stdout.write(chalk.red.bold(msg));
                }
            }).catch(err => signale.error(err.message));
    });

// ### GO Search
//
// This searches the QuickGo database for generic entries. You can provide
// any kind of query you like. For example, you can search for _PLAT_:
//
// ```shell
// λ gemma go-search PLAT
// ┌─────────┬──────────────┬───────────────────────────────────────────────────┬──────────────────────┐
// │ (index) │      id      │                       name                        │        aspect        │
// ├─────────┼──────────────┼───────────────────────────────────────────────────┼──────────────────────┤
// │    0    │ 'GO:0036026' │        'protein C inhibitor-PLAT complex'         │ 'cellular_component' │
// │    1    │ 'GO:0030168' │               'platelet activation'               │ 'biological_process' │
// │    2    │ 'GO:0070527' │              'platelet aggregation'               │ 'biological_process' │
// │    3    │ 'GO:0030220' │               'platelet formation'                │ 'biological_process' │
// │    4    │ 'GO:0002576' │             'platelet degranulation'              │ 'biological_process' │
// │    5    │ 'GO:0070090' │                 'metaphase plate'                 │ 'cellular_component' │
// │    6    │ 'GO:1990073' │                'perforation plate'                │ 'cellular_component' │
// │    7    │ 'GO:0097218' │                   'sieve plate'                   │ 'cellular_component' │
// │    8    │ 'GO:0036344' │             'platelet morphogenesis'              │ 'biological_process' │
// │    9    │ 'GO:0036345' │               'platelet maturation'               │ 'biological_process' │
// │   10    │ 'GO:0009504' │                   'cell plate'                    │ 'cellular_component' │
// │   11    │ 'GO:0032437' │                 'cuticular plate'                 │ 'cellular_component' │
// │   12    │ 'GO:0003142' │         'cardiogenic plate morphogenesis'         │ 'biological_process' │
// │   13    │ 'GO:0042827' │             'platelet dense granule'              │ 'cellular_component' │
// │   14    │ 'GO:0021999' │ 'neural plate anterior/posterior regionalization' │ 'biological_process' │
// │   15    │ 'GO:0021997' │         'neural plate axis specification'         │ 'biological_process' │
// │   16    │ 'GO:0021998' │    'neural plate mediolateral regionalization'    │ 'biological_process' │
// │   17    │ 'GO:0021991' │             'neural plate thickening'             │ 'biological_process' │
// │   18    │ 'GO:0021990' │             'neural plate formation'              │ 'biological_process' │
// │   19    │ 'GO:1990265' │     'platelet-derived growth factor complex'      │ 'cellular_component' │
// │   20    │ 'GO:0070889' │       'platelet alpha granule organization'       │ 'biological_process' │
// │   21    │ 'GO:0033505' │            'floor plate morphogenesis'            │ 'biological_process' │
// │   22    │ 'GO:0033504' │             'floor plate development'             │ 'biological_process' │
// │   23    │ 'GO:0070560' │          'protein secretion by platelet'          │ 'biological_process' │
// │   24    │ 'GO:0070541' │            'response to platinum ion'             │ 'biological_process' │
// └─────────┴──────────────┴───────────────────────────────────────────────────┴──────────────────────┘
// ```
program
    .command('go-search <query>')
    .description('Search the EBI gene ontology database for a general query')
    .action(async function(query, cmd) {
        gemma.query.goSearch(query, cmd)
            .then(function(results) {
                if (results.length) {
                    console.table(results);
                } else {
                    const msg = `no results found for query ${query}\n`;
                    process.stdout.write(chalk.red.bold(msg));
                }
            }).catch(err => signale.error(err.message));
    });

// ### GO Proteins
//
// This searches the EBI proteins database for proteins matching a GO term.
// For example, you can search for proteins associated with the "Protein C
// inhibitor-PLAT complex" (GO:0036026)
//
// ```shell
// λ gemma go-proteins GO:0036026
// ┌─────────┬────────────────────┬───────────────────────────────────────────────────────────────┬──────────────────┐
// │ (index) │         id         │                            protein                            │      genes       │
// ├─────────┼────────────────────┼───────────────────────────────────────────────────────────────┼──────────────────┤
// │    0    │ 'A0A091CUK9_FUKDA' │              'Plasma serine protease inhibitor'               │ [ 'H920_17264' ] │
// │    1    │ 'A0A096NJK2_PAPAN' │                   'Uncharacterized protein'                   │  [ 'SERPINA5' ]  │
// │    2    │ 'A0A0D9REJ2_CHLSB' │                  'Serpin family A member 5'                   │  [ 'SERPINA5' ]  │
// │    3    │ 'A0A1D5QZ04_MACMU' │                   'Uncharacterized protein'                   │  [ 'SERPINA5' ]  │
// │    4    │ 'A0A1U7U5R8_TARSY' │              'plasma serine protease inhibitor'               │  [ 'SERPINA5' ]  │
// │    5    │ 'A0A1U8BVH3_MESAU' │              'plasma serine protease inhibitor'               │  [ 'Serpina5' ]  │
// │    6    │ 'A0A2I2YDG3_GORGO' │                  'Serpin family A member 5'                   │    undefined     │
// │    7    │ 'A0A2J8QMG0_PANTR' │                     'SERPINA5 isoform 1'                      │  [ 'SERPINA5' ]  │
// │    8    │ 'A0A2K5BUG0_AOTNA' │                   'Uncharacterized protein'                   │  [ 'SERPINA5' ]  │
// │    9    │ 'A0A2K5JNV2_COLAP' │                   'Uncharacterized protein'                   │  [ 'SERPINA5' ]  │
// │   10    │ 'A0A2K5MCI7_CERAT' │                   'Uncharacterized protein'                   │  [ 'SERPINA5' ]  │
// │   11    │ 'A0A2K5Q5I2_CEBCA' │                   'Uncharacterized protein'                   │  [ 'SERPINA5' ]  │
// │   12    │ 'A0A2K5WK85_MACFA' │                   'Uncharacterized protein'                   │  [ 'SERPINA5' ]  │
// │   13    │ 'A0A2K5YI81_MANLE' │                   'Uncharacterized protein'                   │  [ 'SERPINA5' ]  │
// │   14    │ 'A0A2K6CF53_MACNE' │                   'Uncharacterized protein'                   │  [ 'SERPINA5' ]  │
// │   15    │ 'A0A2K6EKL0_PROCO' │                   'Uncharacterized protein'                   │  [ 'SERPINA5' ]  │
// │   16    │ 'A0A2K6LR94_RHIBE' │                   'Uncharacterized protein'                   │  [ 'SERPINA5' ]  │
// │   17    │ 'A0A2K6PIF0_RHIRO' │                   'Uncharacterized protein'                   │  [ 'SERPINA5' ]  │
// │   18    │ 'A0A2K6V1R2_SAIBB' │                  'Serpin family A member 5'                   │  [ 'SERPINA5' ]  │
// │   19    │ 'A0A2R9AU45_PANPA' │                   'Uncharacterized protein'                   │  [ 'SERPINA5' ]  │
// │   20    │   'D2HEM8_AILME'   │                   'Uncharacterized protein'                   │  [ 'SERPINA5' ]  │
// │   21    │   'E2RMF9_CANLF'   │                   'Uncharacterized protein'                   │  [ 'SERPINA5' ]  │
// │   22    │    'F1SCE3_PIG'    │                   'Uncharacterized protein'                   │  [ 'SERPINA5' ]  │
// │   23    │    'F7EMJ6_RAT'    │ 'Serine (Or cysteine) peptidase inhibitor, clade A, member 5' │  [ 'Serpina5' ]  │
// │   24    │   'F7GRA1_CALJA'   │                  'Serpin family A member 5'                   │  [ 'SERPINA5' ]  │
// │   25    │   'G1S667_NOMLE'   │                   'Uncharacterized protein'                   │  [ 'SERPINA5' ]  │
// │   26    │   'G1SQG6_RABIT'   │                  'Serpin family A member 5'                   │  [ 'SERPINA5' ]  │
// │   27    │   'G3T0X8_LOXAF'   │                   'Uncharacterized protein'                   │  [ 'SERPINA5' ]  │
// │   28    │   'G5B492_HETGA'   │              'Plasma serine protease inhibitor'               │ [ 'GW7_16185' ]  │
// │   29    │   'H0VZ56_CAVPO'   │                   'Uncharacterized protein'                   │  [ 'SERPINA5' ]  │
// │   30    │   'H0X6H4_OTOGA'   │                   'Uncharacterized protein'                   │  [ 'SERPINA5' ]  │
// │   31    │   'H2NM57_PONAB'   │                  'Serpin family A member 5'                   │  [ 'SERPINA5' ]  │
// │   32    │   'I3NE99_ICTTR'   │                   'Uncharacterized protein'                   │  [ 'SERPINA5' ]  │
// │   33    │   'L8ILP6_9CETA'   │              'Plasma serine protease inhibitor'               │ [ 'M91_13739' ]  │
// │   34    │   'M3WCX5_FELCA'   │                   'Uncharacterized protein'                   │  [ 'SERPINA5' ]  │
// │   35    │   'M3XVL4_MUSPF'   │                   'Uncharacterized protein'                   │  [ 'SERPINA5' ]  │
// │   36    │    'IPSP_HUMAN'    │              'Plasma serine protease inhibitor'               │  [ 'SERPINA5' ]  │
// │   37    │    'IPSP_MOUSE'    │              'Plasma serine protease inhibitor'               │  [ 'Serpina5' ]  │
// │   38    │    'IPSP_BOVIN'    │              'Plasma serine protease inhibitor'               │  [ 'SERPINA5' ]  │
// │   39    │   'W5Q0L2_SHEEP'   │                   'Uncharacterized protein'                   │  [ 'SERPINA5' ]  │
// └─────────┴────────────────────┴───────────────────────────────────────────────────────────────┴──────────────────┘
// ```
program
    .command('go-proteins <goterm>')
    .description('Search the EBI proteins database for gene products associated with a given gene ontology')
    .action(async function(query, cmd) {
        gemma.query.goProteins(query, cmd)
            .then(function(results) {
                if (results.length) {
                    console.table(results);
                } else {
                    const msg = `no results found for GO term ${query}\n`;
                    process.stdout.write(chalk.red.bold(msg));
                }
            }).catch(err => signale.error(err.message));
    });

// ## Epilog

// If you provide an unrecognized subcommand, we print the [help information](#help).
program.on('command:*', function() {
    process.stdout.write(program.helpInformation() + '\n');
    process.exit(1);
});

// Everything up to this point just sets up the command-line interface. We
// still need to tell the CLI to parse the arguments and execute the
// appropriate actions.
program.parse(process.argv);

// If you don't provide any arguments, we print the [help information](#help).
if (process.argv.length == 2) {
    process.stderr.write(program.helpInformation() + '\n');
    process.exit(1);
}

// It is always possible for an error to slip by error handling code. To make
// sure you see a nice error message, we process all unhandled promise
// rejections.
process.on('unhandledRejection', function(err) {
    signale.error(err);
    process.exit(1);
});
