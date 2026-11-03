// Layout check: no element overflows, at five widths.
//   Pages: console with WC2N + Rheumatology results, the open Evidence panel,
//   and /summary. Widths: 320, 390, 768, 1024, 1440.
// For every element it fails if:
//   1. scrollWidth > clientWidth (content wider than its own box), or
//   2. a child's box sticks out of its parent's content box, or
//   3. the document is wider than the viewport.
// Uses playwright-core with the Chrome already installed on this machine.
//
// Usage: node checks/layout-check.mjs [baseUrl]   (default http://localhost:3040)

import { chromium } from 'playwright-core';

const BASE = process.argv[2] || 'http://localhost:3040';
const WIDTHS = [320, 390, 768, 1024, 1440];

// Runs inside the page. Returns a list of problems in `root` (or the whole page).
function audit(rootSelector) {
  const TOLERANCE = 0.5; // px, for sub-pixel rounding
  const root = rootSelector ? document.querySelector(rootSelector) : document.body;
  const problems = [];
  const describe = (el) => {
    const cls = typeof el.className === 'string' && el.className ? '.' + el.className.split(' ')[0].replace(/__[A-Za-z0-9]+__/, '_') : '';
    const text = (el.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 30);
    return `${el.tagName.toLowerCase()}${cls} "${text}"`;
  };
  const skip = (el) => {
    if (el.closest('svg') && el.tagName.toLowerCase() !== 'svg') return true;
    if (el.closest('.visually-hidden')) return true;
    const cs = getComputedStyle(el);
    if (cs.display === 'none' || cs.visibility === 'hidden') return true;
    if (cs.position === 'absolute' || cs.position === 'fixed') return el.tagName !== 'DIALOG';
    return false;
  };

  for (const el of root.querySelectorAll('*')) {
    if (skip(el)) continue;
    const cs = getComputedStyle(el);
    const isInline = cs.display === 'inline';

    // 1. Content wider than the box (only meaningful for block-level boxes).
    if (!isInline && el.clientWidth > 0 && el.scrollWidth > el.clientWidth + TOLERANCE) {
      problems.push(`overflow: ${describe(el)} scrollWidth ${el.scrollWidth} > clientWidth ${el.clientWidth}`);
    }

    // 2. Child outside the parent's content box.
    if (isInline || cs.display === 'contents' || el.tagName === 'svg') continue;
    const r = el.getBoundingClientRect();
    if (r.width === 0) continue;
    const box = {
      left: r.left + parseFloat(cs.borderLeftWidth) + parseFloat(cs.paddingLeft),
      right: r.right - parseFloat(cs.borderRightWidth) - parseFloat(cs.paddingRight),
    };
    for (const child of el.children) {
      if (skip(child)) continue;
      const c = child.getBoundingClientRect();
      if (c.width === 0 && c.height === 0) continue;
      if (c.left < box.left - TOLERANCE || c.right > box.right + TOLERANCE) {
        problems.push(`outside parent: ${describe(child)} [${Math.round(c.left)}..${Math.round(c.right)}] in ${describe(el)} content [${Math.round(box.left)}..${Math.round(box.right)}]`);
      }
    }
  }

  // 3. Page wider than the viewport.
  const doc = document.documentElement;
  if (doc.scrollWidth > doc.clientWidth) problems.push(`page: scrollWidth ${doc.scrollWidth} > viewport ${doc.clientWidth}`);
  return problems;
}

async function searchConsole(page, width) {
  await page.goto(`${BASE}/`, { waitUntil: 'networkidle' });
  await page.fill('#postcode', 'WC2N 5DU');
  await page.check('input[name="specialty"][value="410"]', { force: true });
  await page.waitForSelector('#hero-name', { timeout: 15000 });
  if (width < 990) {
    await page.click('button:has-text("Show results")');
    await page.waitForTimeout(300);
  }
}

const browser = await chromium.launch({ channel: 'chrome', headless: true });
const rows = [];
let failed = false;

for (const width of WIDTHS) {
  const height = width < 768 ? 844 : 900;
  const context = await browser.newContext({ viewport: { width, height }, reducedMotion: 'reduce' });
  const page = await context.newPage();

  const results = {};

  await searchConsole(page, width);
  results['console'] = await page.evaluate(audit, null);

  await page.click('button:has-text("See evidence")');
  await page.waitForSelector('dialog[open][data-state="open"]');
  await page.waitForTimeout(400);
  results['evidence'] = await page.evaluate(audit, 'dialog[open]');

  await page.goto(`${BASE}/summary?provider=RJ1&specialty=410&km=1.3`, { waitUntil: 'networkidle' });
  results['summary'] = await page.evaluate(audit, null);

  rows.push({ width, results });
  for (const p of Object.values(results)) if (p.length) failed = true;
  await context.close();
}
await browser.close();

// Table
const PAGES = ['console', 'evidence', 'summary'];
console.log(`\nLayout check against ${BASE}\n`);
console.log('  Width   ' + PAGES.map((p) => p.padEnd(10)).join(''));
console.log('  ' + '-'.repeat(38));
for (const { width, results } of rows) {
  console.log(`  ${String(width).padEnd(8)}` + PAGES.map((p) => (results[p].length ? `FAIL(${results[p].length})` : 'pass').padEnd(10)).join(''));
}
for (const { width, results } of rows) {
  for (const p of PAGES) {
    if (!results[p].length) continue;
    console.log(`\n  ${width}px ${p}:`);
    results[p].slice(0, 8).forEach((m) => console.log(`    - ${m}`));
    if (results[p].length > 8) console.log(`    … and ${results[p].length - 8} more`);
  }
}
console.log(failed ? '\nLAYOUT CHECK FAILED' : '\nALL WIDTHS PASS');
process.exit(failed ? 1 : 0);
