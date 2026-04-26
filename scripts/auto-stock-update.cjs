/**
 * Daily auto-update script for Victor inventory.
 *
 * Logs into FLAM (https://victorsport.flam.bz/), downloads the inventory CSV,
 * parses it, and POSTs the data to the Google Apps Script Web App which
 * replaces Inventory_Raw in the spreadsheet.
 *
 * Required env vars (set as GitHub Actions secrets):
 *   FLAM_LOGIN_ID       — your FLAM account ID
 *   FLAM_PASSWORD       — your FLAM password
 *   GAS_URL             — Google Apps Script Web App URL
 *   GAS_AUTO_TOKEN      — shared secret matching AUTO_UPDATE_TOKEN in Apps
 *                         Script Properties (so random web traffic can't
 *                         replace your inventory)
 *
 * Exits non-zero on any failure so GitHub Actions reports it.
 */

'use strict';

const LOGIN_URL  = 'https://victorsport.flam.bz/login';
const EXPORT_URL = 'https://victorsport.flam.bz/stockrecents/export?sbd=&sh=&p=&pc=&pcd=&gs=1&nz=1&sn=&lt=&gsn=&gln=&sast=&exc_sd=&exc_ed=&exc_sq=&exc_sq_eq=&s_ship=&s_sale=&s_arrival=&s_purchase=&s_receiptpayschedule=&s_receiptpay=&l_return=';

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36';

const die = (msg) => { console.error('ERROR:', msg); process.exit(1); };

const getEnv = (key) => {
  const v = process.env[key];
  if (!v) die(`Missing required env var: ${key}`);
  return v;
};

/** Cookie jar that survives across requests. */
const cookies = new Map();

const setCookiesFromHeader = (setCookieHeaders) => {
  if (!setCookieHeaders) return;
  const list = Array.isArray(setCookieHeaders) ? setCookieHeaders : [setCookieHeaders];
  for (const sc of list) {
    const [pair] = sc.split(';');
    const eq = pair.indexOf('=');
    if (eq < 0) continue;
    const name = pair.substring(0, eq).trim();
    const value = pair.substring(eq + 1).trim();
    cookies.set(name, value);
  }
};

const cookieHeader = () =>
  [...cookies.entries()].map(([k, v]) => `${k}=${v}`).join('; ');

/** fetch() wrapper that maintains cookies and sets a real UA. */
const httpFetch = async (url, options = {}) => {
  const headers = {
    'User-Agent': UA,
    'Accept': '*/*',
    'Accept-Language': 'ja,en;q=0.9',
    ...(options.headers || {}),
  };
  if (cookies.size > 0) headers.Cookie = cookieHeader();
  const res = await fetch(url, { ...options, headers, redirect: 'manual' });
  // Capture set-cookie (Node 18+ exposes via getSetCookie)
  const sc = typeof res.headers.getSetCookie === 'function'
    ? res.headers.getSetCookie()
    : res.headers.raw?.()['set-cookie'];
  setCookiesFromHeader(sc);
  return res;
};

/** Follow redirects manually so we keep cookies on each hop. */
const fetchFollow = async (url, options = {}, maxHops = 8) => {
  let current = url;
  let opts = { ...options };
  for (let i = 0; i < maxHops; i++) {
    const res = await httpFetch(current, opts);
    if (res.status >= 300 && res.status < 400) {
      const loc = res.headers.get('location');
      if (!loc) return res;
      current = new URL(loc, current).toString();
      opts = { method: 'GET' };  // redirect always becomes GET
      continue;
    }
    return res;
  }
  throw new Error('Too many redirects');
};

const login = async (loginId, password) => {
  console.log('→ Loading login page...');
  await fetchFollow(LOGIN_URL);

  console.log('→ POST credentials...');
  const body = new URLSearchParams({
    'data[User][loginid]': loginId,
    'data[User][password]': password,
  });
  const res = await fetchFollow(LOGIN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  });
  // After login the site usually redirects to the home page (200).
  if (res.status !== 200) {
    die(`Login failed (HTTP ${res.status})`);
  }
  // Heuristic: if response still contains the login form, creds were rejected.
  const html = await res.text();
  if (html.includes('name="data[User][loginid]"') && html.includes('FLAMアカウントID')) {
    die('Login failed — credentials rejected');
  }
  console.log('✓ Logged in');
};

const downloadCsv = async () => {
  console.log('→ Downloading CSV...');
  const res = await fetchFollow(EXPORT_URL);
  if (res.status !== 200) die(`CSV download failed (HTTP ${res.status})`);
  const buf = Buffer.from(await res.arrayBuffer());
  console.log(`✓ Downloaded ${buf.length} bytes`);
  return buf;
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
  await login(loginId, password);
  const buf = await downloadCsv();
  const rows = parseInventoryCsv(buf);
  console.log(`Parsed ${rows.length} unique SKUs`);
  if (rows.length === 0) die('No SKUs in CSV');
  await postToGas(rows);
  console.log('Done.');
})().catch(err => die(err.stack || err.message));
