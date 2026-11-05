#!/usr/bin/env node
'use strict';
// mdq — jq-style queries for markdown pipe tables. Zero deps.
const fs = require('fs');
const rest = process.argv.slice(2);
const arg = (n) => { const i = rest.indexOf(n); return i >= 0 ? rest[i + 1] : undefined; };
const inFile = arg('--file');
const raw = inFile ? fs.readFileSync(inFile, 'utf8') : fs.readFileSync(0, 'utf8');
const lines = raw.split('\n');

// Find first markdown table (header row + |---| separator)
function parseTables(lines) {
  const tables = [];
  let rows = null, headers = null;
  const flush = () => { if (headers) tables.push({ headers, rows }); headers = null; rows = null; };
  for (const line of lines) {
    const t = line.trim();
    if (t.startsWith('|') && t.endsWith('|') && t.length > 2) {
      const cells = t.slice(1, -1).split('|').map(s => s.trim());
      const isSep = cells.every(c => /^:?-{2,}:?$/.test(c)) && cells.length > 0;
      if (isSep) { if (!headers) headers = []; continue; }
      if (headers === null) { headers = cells; rows = []; }
      else if (rows !== null) rows.push(cells);
    } else flush();
  }
  flush();
  return tables;
}
const tables = parseTables(lines);
if (!tables.length) { console.error('mdq: no markdown tables found'); process.exit(1); }
const { headers, rows } = tables[0];

const selects = (arg('--select') || '').split(',').map(s => s.trim()).filter(Boolean);
const filters = [];
for (let i = 0; i < rest.length; i++) {
  if (rest[i] === '--where') {
    const m = String(rest[i + 1] || '').match(/^([^=~=<>]+)(==|~=|!=)(.+)$/);
    if (m) filters.push({ col: m[1].trim(), op: m[2], val: m[3].trim() });
  }
}
const sortKey = arg('--sort'); const desc = rest.includes('--desc');
const num = (v) => (v && /^-?[0-9][0-9.,]*[kKmM]?$/.test(v.trim()) ? parseFloat(v.replace(/[,\.](?=[0-9]{3}\b)/g, '').replace(',', '.')) : null);

let data = rows.filter(r => filters.every(f => {
  const idx = headers.indexOf(f.col); if (idx < 0 || r[idx] === undefined) return false;
  const cell = r[idx];
  if (f.op === '==') return cell === f.val;
  if (f.op === '!=') return cell !== f.val;
  return cell.toLowerCase().includes(f.val.toLowerCase());
}));
if (sortKey) {
  const idx = headers.indexOf(sortKey);
  if (idx >= 0) data = [...data].sort((a, b) => {
    const na = num(a[idx]), nb = num(b[idx]);
    const c = (na !== null && nb !== null) ? na - nb : String(a[idx]).localeCompare(String(b[idx]));
    return desc ? -c : c;
  });
}
const cols = selects.length ? selects : headers;
const idxs = cols.map(c => { const i = headers.indexOf(c); if (i < 0) { console.error('mdq: no column ' + c); process.exit(1); } return i; });

if (rest.includes('--header')) console.log('| ' + cols.join(' | ') + ' |');
const fmt = (r) => rest.includes('--no-pipes') ? idxs.map(i => r[i]).join('\t') : '| ' + idxs.map(i => r[i]).join(' | ') + ' |';
for (const r of data) console.log(fmt(r));
if (rest.includes('--count')) console.error(data.length + ' rows');
