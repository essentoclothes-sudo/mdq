#!/usr/bin/env node
'use strict';
// mdq tests — zero deps, node:test + CLI spawn.
const test = require('node:test');
const assert = require('node:assert');
const { execFileSync, spawnSync } = require('node:child_process');
const path = require('node:path');

const BIN = path.join(__dirname, '..', 'mdq.js');
const MD = [
  '# T',
  '',
  '| Name | Qty | Status |',
  '|---|---|---|',
  '| alpha | 3 | ok |',
  '| beta | 10 | fail |',
  '| gamma | 1.5 | ok |',
  '',
  'text',
].join('\n');

const run = (args, input = MD) =>
  execFileSync(process.execPath, [BIN, ...args], { input, encoding: 'utf8' }).trimEnd();
const runFail = (args, input = MD) => {
  try { execFileSync(process.execPath, [BIN, ...args], { input, encoding: 'utf8' }); return null; }
  catch (e) { return { code: e.status, stderr: String(e.stderr).trim() }; }
};

test('select columns', () => {
  assert.strictEqual(run(['--select', 'Name']), '| alpha |\n| beta |\n| gamma |');
});

test('filter == and !=', () => {
  assert.strictEqual(run(['--where', 'Status==ok', '--select', 'Name']), '| alpha |\n| gamma |');
  assert.strictEqual(run(['--where', 'Status!=ok', '--select', 'Name']), '| beta |');
});

test('filter ~= is case-insensitive contains', () => {
  assert.strictEqual(run(['--where', 'Status~=AIL', '--select', 'Name']), '| beta |');
  assert.strictEqual(run(['--where', 'Name~=AMM', '--select', 'Name']), '| gamma |');
});

test('numeric sort and --desc', () => {
  assert.strictEqual(run(['--sort', 'Qty', '--select', 'Name']), '| gamma |\n| alpha |\n| beta |');
  assert.strictEqual(run(['--sort', 'Qty', '--desc', '--select', 'Name']), '| beta |\n| alpha |\n| gamma |');
});

test('--header prints header row', () => {
  const out = run(['--header', '--select', 'Qty']);
  assert.ok(out.startsWith('| Qty |'));
});

test('--no-pipes uses tabs', () => {
  assert.strictEqual(run(['--select', 'Name', '--no-pipes']), 'alpha\nbeta\ngamma');
});

test('--count reports to stderr and exits 0', () => {
  const r = spawnSync(process.execPath, [BIN, '--count', '--where', 'Status==ok'], { input: MD, encoding: 'utf8' });
  assert.strictEqual(r.status, 0);
  assert.strictEqual(r.stderr.trim(), '2 rows');
});

test('unknown column exits 1', () => {
  const r = runFail(['--select', 'Nope']);
  assert.strictEqual(r.code, 1);
  assert.ok(r.stderr.includes('no column Nope'));
});

test('no tables exits 1', () => {
  const r = runFail([], 'no tables here');
  assert.strictEqual(r.code, 1);
  assert.ok(r.stderr.includes('no markdown tables'));
});

test('--file reads from disk', () => {
  const fs = require('node:fs');
  const os = require('node:os');
  const p = path.join(os.tmpdir(), 'mdq-test-' + Date.now() + '.md');
  fs.writeFileSync(p, MD);
  try { assert.strictEqual(run(['--file', p, '--select', 'Name']), '| alpha |\n| beta |\n| gamma |'); }
  finally { fs.unlinkSync(p); }
});
