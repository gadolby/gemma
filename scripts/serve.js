const express = require('express');
const { spawn } = require('child_process');

const groc = spawn('groc');

groc.stdout.on('data', (data) => process.stdout.write(data));

groc.stderr.on('data', (data) => process.stderr.write(data));

groc.on('close', function(code) {
    express().use(express.static('./docs')).listen(8080);
});
