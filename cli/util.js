const last = (arr) => arr[arr.length - 1];

const collectOpts = function(cmd, ...keys) {
    let opts = Object.assign({}, cmd.parent);
    keys.forEach(k => opts[k] = cmd[k]);
    return opts;
};

module.exports = {
    last, collectOpts
};
