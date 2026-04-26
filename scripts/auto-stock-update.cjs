/**
 * Daily auto-update script for Victor inventory.
 *
 * Uses a headless Chromium browser (Playwright) to:
 *   1. Log into FLAM (https://victorsport.flam.bz/)
 *   2. Navigate to the stock-export page
 *   3. Click ダウンロード → CSV形式(.csv) to download the inventory CSV
 * Then parses it (Shift-JIS) and POSTs the rows to the Google Apps Script
 * Web App, which fully replaces Inventory_Raw in the spreadsheet.
 *
 * Required env vars (set as GitHub Actions secrets):
 *   FLAM_LOGIN_ID       — FLAM account ID
 *   FLAM_PASSWORD       — FLAM password
 *   GAS_URL             — Google Apps Script Web App URL
 *   GAS_AUTO_TOKEN      — shared secret matching AUTO_UPDATE_TOKEN in Apps
 *                         Script Properties (so random web traffic can't
 *                         replace your inventory)
 *
 * Exits non-zero on any failure so GitHub Actions reports it.
 */

'use strict';

const fs = require('fs');
const { chromium } = require('playwright');

const LOGIN_URL  = 'https://victorsport.flam.bz/login';
const EXPORT_URL = 'https://victorsport.flam.bz/stockrecents/export?sbd=&sh=&p=&pc=&pcd=&gs=1&nz=1&sn=&lt=&gsn=&gln=&sast=&exc_sd=&exc_ed=&exc_sq=&exc_sq_eq=&s_ship=&s_sale=&s_arrival=&s_purchase=&s_receiptpayschedule=&s_receiptpay=&l_return=';

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36';

const die = (msg) => { console.error('ERROR:', msg); process.exit(1); };

const getEnv = (key) => {
  const v = process.env[key];
  if (!v) die(`Missing required env var: ${key}`);
  return v;
};

/**
 * Drive the FLAM site through Playwright to obtain the inventory CSV.
 * Returns a Buffer of the raw (Shift-JIS) CSV bytes.
 */
const downloadCsvViaBrowser = async (loginId, password) => {
  console.log('→ Launching headless Chromium...');
  const browser = await chromium.launch({ headless: true });

  try {
    const context = await browser.newContext({
      acceptDownloads: true,
      locale: 'ja-JP',
      userAgent: UA,
    });
    const page = await context.newPage();

    console.log('→ Loading login page...');
    await page.goto(LOGIN_URL, { waitUntil: 'domcontentloaded' });

    console.log('→ Filling login form...');
    await page.fill('input[name="data[User][loginid]"]', loginId);
    await page.fill('input[name="data[User][password]"]', password);

    console.log('→ Submitting credentials...');
    await Promise.all([
      page.waitForLoadState('domcontentloaded'),
      page.click('input[type="submit"], button[type="submit"]'),
    ]);

    if (await page.locator('input[name="data[User][loginid]"]').count() > 0) {
      die('Login failed — credentials rejected');
    }
    console.log('✓ Logged in');

    console.log('→ Opening export page...');
    await page.goto(EXPORT_URL, { waitUntil: 'domcontentloaded' });

    console.log('→ Clicking ダウンロード button...');
    // The page has a button labelled ダウンロード that toggles a dropdown.
    await page.getByRole('button', { name: /ダウンロード/ }).first().click()
      .catch(async () => {
        // Fallback: click any element containing ダウンロード text.
        await page.locator(':text("ダウンロード")').first().click();
      });

    console.log('→ Waiting for CSV format option...');
    const csvLink = page.locator(':text("CSV形式")').first();
    await csvLink.waitFor({ state: 'visible', timeout: 10000 });

    console.log('→ Triggering CSV download...');
    const [download] = await Promise.all([
      page.waitForEvent('download', { timeout: 30000 }),
      csvLink.click(),
    ]);

    const downloadPath = await download.path();
    if (!downloadPath) die('Download did not produce a file');
    const buf = fs.readFileSync(downloadPath);
    console.log(`✓ Downloaded ${buf.length} bytes (${download.suggestedFilename()})`);
    return buf;
  } finally {
    await browser.close();
  }
};

/** Parse a CSV line, returning the cell values (handles quoted commas). */
const parseCsvLine = (line) => {
  const cells = [];
  let cur = '', inQuote = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuote && line[i + 1] === '"') { cur += '"'; i++; }
      else inQuote = !inQuote;
    } else if (ch === ',' && !inQuote) {
      cells.push(cur); cur = '';
    } else { cur += ch; }
  }
  cells.push(cur);
  return cells;
};

const parseInventoryCsv = (buf) => {
  // FLAM exports CSV in Shift-JIS
  const text = new TextDecoder('shift-jis').decode(buf);
  const lines = text.split(/\r?\n/).filter(Boolean);
  if (lines.length < 2) die('CSV has no data rows');

  const header = parseCsvLine(lines[0]);
  const idx = (name) => header.findIndex(h => h === name);
  const skuIdx       = idx('商品コード');
  const nameIdx      = idx('商品名');
  const priceIdx     = idx('標準価格');
  const stockIdx     = idx('在庫数');
  const warehouseIdx = idx('倉庫コード');

  if (skuIdx < 0 || stockIdx < 0) die('CSV missing required columns 商品コード / 在庫数');

  // Aggregate by SKU (CSV may have one row per warehouse — sum stock per SKU)
  const map = new Map();
  for (let i = 1; i < lines.length; i++) {
    const c = parseCsvLine(lines[i]);
    const sku = (c[skuIdx] || '').trim();
    if (!sku) continue;
    if (!map.has(sku)) {
      map.set(sku, {
        sku,
        productName: (c[nameIdx] || '').trim(),
        price: Number(c[priceIdx]) || 0,
        stock: 0,
        warehouseCode: (c[warehouseIdx] || '').trim(),
      });
    }
    map.get(sku).stock += Number(c[stockIdx]) || 0;
  }

  return [...map.values()];
};

const postToGas = async (rows) => {
  const url = getEnv('GAS_URL');
  const token = getEnv('GAS_AUTO_TOKEN');
  console.log(`→ Posting ${rows.length} rows to Apps Script...`);
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'User-Agent': UA },
    body: JSON.stringify({ action: 'replaceInventory', rows, token }),
  });
  if (!res.ok) die(`Apps Script HTTP ${res.status}`);
  const result = await res.json();
  if (!result.success) die(`Apps Script: ${result.message || 'unknown error'}`);
  console.log(`✓ ${result.message}`);
};

(async () => {
  const loginId = getEnv('FLAM_LOGIN_ID');
  const password = getEnv('FLAM_PASSWORD');
  const buf = await downloadCsvViaBrowser(loginId, password);
  const rows = parseInventoryCsv(buf);
  console.log(`Parsed ${rows.length} unique SKUs`);
  if (rows.length === 0) die('No SKUs in CSV');
  await postToGas(rows);
  console.log('Done.');
})().catch(err => die(err.stack || err.message));
