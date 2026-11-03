// Extracts the "Providers" sheet from CQC's Latest_ratings.ods into a CSV.
// The .ods unzips to a ~1 GB XML file, so we stream it through the system
// `unzip` tool and parse rows one at a time. No dependencies.
//
// Usage: node scripts/extract-cqc.mjs data/raw/cqc/latest_ratings.ods data/raw/cqc-providers.csv

import { spawn } from 'node:child_process';
import { createWriteStream } from 'node:fs';

const [odsPath, outPath] = process.argv.slice(2);
if (!odsPath || !outPath) {
  console.error('Usage: node scripts/extract-cqc.mjs <ratings.ods> <out.csv>');
  process.exit(1);
}

const SHEET = 'Providers';
const out = createWriteStream(outPath);
const unzip = spawn('unzip', ['-p', odsPath, 'content.xml']);
unzip.stdout.setEncoding('utf8');

let buf = '';
let inSheet = false;
let done = false;
let rows = 0;

const decode = (s) =>
  s.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"')
   .replace(/&apos;/g, "'").replace(/&#(\d+);/g, (_, n) => String.fromCharCode(n))
   .replace(/&amp;/g, '&');

const csvCell = (v) => (/[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v);

// Turn one <table:table-row> into an array of cell strings.
function parseRow(xml) {
  const cells = [];
  const cellRe = /<table:(?:covered-)?table-cell\b([^>]*?)(\/>|>([\s\S]*?)<\/table:(?:covered-)?table-cell>)/g;
  let m;
  while ((m = cellRe.exec(xml))) {
    const attrs = m[1];
    const inner = m[3] || '';
    const rep = Number((attrs.match(/table:number-columns-repeated="(\d+)"/) || [])[1] || 1);
    const paras = [...inner.matchAll(/<text:p[^>]*>([\s\S]*?)<\/text:p>/g)]
      .map((p) => decode(p[1].replace(/<text:s[^>]*\/>/g, ' ').replace(/<[^>]+>/g, '')));
    const val = paras.join(' ').trim();
    // Trailing empty cells are often repeated thousands of times; cap them.
    for (let i = 0; i < Math.min(rep, 64); i++) cells.push(val);
  }
  while (cells.length && cells[cells.length - 1] === '') cells.pop();
  return cells;
}

unzip.stdout.on('data', (chunk) => {
  if (done) return;
  buf += chunk;

  if (!inSheet) {
    const i = buf.indexOf(`table:name="${SHEET}"`);
    if (i === -1) { buf = buf.slice(-200); return; }
    inSheet = true;
    buf = buf.slice(i);
  }

  let end;
  while ((end = buf.indexOf('</table:table-row>')) !== -1) {
    const start = buf.indexOf('<table:table-row');
    const rowXml = buf.slice(start, end);
    buf = buf.slice(end + 18);
    const cells = parseRow(rowXml);
    if (cells.length) { out.write(cells.map(csvCell).join(',') + '\n'); rows++; }
  }
  const sheetEnd = buf.indexOf('</table:table>');
  if (sheetEnd !== -1 && buf.indexOf('<table:table-row') === -1) {
    done = true;
    unzip.kill();
  }
});

unzip.on('close', () => {
  out.end();
  console.log(`Wrote ${rows} rows from "${SHEET}" to ${outPath}`);
});
