const fs = require('fs-extra');
const path = require('path');

const version = function() {
    const packageFile = path.join(__dirname, '..', 'package.json');
    return JSON.parse(fs.readFileSync(packageFile)).version;
};

const last = (arr) => arr[arr.length - 1];

const collectOpts = function(cmd, ...keys) {
    let opts = Object.assign({}, cmd.parent);
    keys.forEach(k => opts[k] = cmd[k]);
    return opts;
};

module.exports = {
    version, last, collectOpts
};
