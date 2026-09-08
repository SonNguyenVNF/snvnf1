'use strict';
const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '..', 'data');

function ensureSeeded(name) {
  const real = path.join(DATA_DIR, `${name}.json`);
  const example = path.join(DATA_DIR, `${name}.example.json`);
  if (!fs.existsSync(real) && fs.existsSync(example)) {
    fs.copyFileSync(example, real);
  }
}

function readJSON(name) {
  ensureSeeded(name);
  const file = path.join(DATA_DIR, `${name}.json`);
  const raw = fs.readFileSync(file, 'utf8');
  return JSON.parse(raw);
}

function writeJSON(name, data) {
  const file = path.join(DATA_DIR, `${name}.json`);
  fs.writeFileSync(file, JSON.stringify(data, null, 2), 'utf8');
}

module.exports = { readJSON, writeJSON, ensureSeeded };
