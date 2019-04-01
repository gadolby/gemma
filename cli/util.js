const chalk = require('chalk');

const last = (arr) => arr[arr.length - 1];

const whitespace = (w) => new Array(w).fill(' ').join('');

const table = function(heading, data) {
    const hlen = heading.length;
    const dlen = Math.max(0, ...data.map(d => d.length));
    const width = Math.max(hlen, dlen);
    const hlPadWidth = Math.floor((width - hlen) / 2);

    const hlPad = whitespace(hlPadWidth);
    const hrPad = whitespace(width - hlen - hlPadWidth);
    const dPad = whitespace(Math.floor((width - dlen) / 2));

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

module.exports = {
    last, table, collectOpts
};
