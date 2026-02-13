// Google Sheets API Service
// 用於讀取和更新 Google Sheets 資料

const API_KEY = import.meta.env.VITE_GOOGLE_API_KEY;
const SPREADSHEET_ID = import.meta.env.VITE_GOOGLE_SPREADSHEET_ID;
const APPS_SCRIPT_URL = import.meta.env.VITE_GOOGLE_APPS_SCRIPT_URL;
const BASE_URL = 'https://sheets.googleapis.com/v4/spreadsheets';

// 工作表名稱
export const SHEETS = {
  PRODUCT_MASTER: 'Product_Master',
  INVENTORY_RAW: 'Inventory_Raw',
  CATEGORY_LIST: 'Category_List',
  UPLOAD_LOGS: 'Upload_Logs',
} as const;

// Google Sheets 原始資料型別
export interface ProductMasterRow {
  sku: string;
  category: string;
  masterName: string;
  subCategory: string;
  modelName: string;
  gender: string;
  colorCode: string;
  color: string;
  size: string;
  weightClass: string;
  gripSize: string;
  remarks: string;
  imageFilename: string;
}

export interface InventoryRawRow {
  sku: string;           // 商品コード
  productName: string;   // 商品名
  stock: number;         // 現在在庫数
  price: number;         // 標準価格
  warehouseCode: string; // 倉庫コード
  lastUpdated: string;   // Last_Updated
}

/**
 * 讀取 Google Sheet 指定工作表的資料
 */
export async function fetchSheetData(sheetName: string): Promise<string[][]> {
  const url = `${BASE_URL}/${SPREADSHEET_ID}/values/${encodeURIComponent(sheetName)}?key=${API_KEY}`;

  try {
    const response = await fetch(url);

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`Google Sheets API Error: ${error.error?.message || response.statusText}`);
    }

    const data = await response.json();
    return data.values || [];
  } catch (error) {
    console.error(`Failed to fetch sheet "${sheetName}":`, error);
    throw error;
  }
}

/**
 * 讀取 Product_Master 工作表
 */
export async function fetchProductMaster(): Promise<ProductMasterRow[]> {
  const rows = await fetchSheetData(SHEETS.PRODUCT_MASTER);

  if (rows.length < 2) return []; // 沒有資料（只有標題或空）

  // 跳過標題列，解析資料
  return rows.slice(1).map(row => ({
    sku: row[0] || '',
    category: row[1] || '',
    masterName: row[2] || '',
    subCategory: row[3] || '',
    modelName: row[4] || '',
    gender: row[5] || '',
    colorCode: row[6] || '',
    color: row[7] || '',
    size: row[8] || '',
    weightClass: row[9] || '',
    gripSize: row[10] || '',
    remarks: row[11] || '',
    imageFilename: row[12] || '',
  }));
}

/**
 * 讀取 Inventory_Raw 工作表
 */
export async function fetchInventoryRaw(): Promise<InventoryRawRow[]> {
  const rows = await fetchSheetData(SHEETS.INVENTORY_RAW);

  if (rows.length < 2) return [];

  return rows.slice(1).map(row => ({
    sku: row[0] || '',
    productName: row[1] || '',
    stock: parseInt(row[2], 10) || 0,
    price: parseInt(row[3], 10) || 0,
    warehouseCode: row[4] || '',
    lastUpdated: row[5] || '',
  }));
}

/**
 * 將未登錄商品寫入 Product_Master
 * 透過 Google Apps Script Web App 作為中介寫入
 */
export async function writeUnregisteredProducts(
  products: Array<{ sku: string; productName: string }>
): Promise<{ success: boolean; message: string; count: number }> {
  if (!APPS_SCRIPT_URL) {
    throw new Error('Google Apps Script URL が設定されていません（VITE_GOOGLE_APPS_SCRIPT_URL）');
  }

  const response = await fetch(APPS_SCRIPT_URL, {
    method: 'POST',
    body: JSON.stringify({ action: 'addUnregistered', products }),
  });

  if (!response.ok) {
    throw new Error(`書き込みに失敗しました (${response.status})`);
  }

  const result = await response.json();

  if (!result.success) {
    throw new Error(result.message || '書き込みに失敗しました');
  }

  return {
    success: true,
    message: `${result.added} 件の未登録商品を Product_Master に追加しました${result.skipped > 0 ? `（${result.skipped} 件は既に存在）` : ''}`,
    count: result.added,
  };
}

/**
 * 將 Google Drive 圖片連結轉換為可用的圖片 URL
 */
export function convertGoogleDriveUrl(url: string): string {
  if (!url) return '';

  // Google Drive 分享連結格式: https://drive.google.com/file/d/FILE_ID/view?usp=drive_link
  const match = url.match(/\/d\/([a-zA-Z0-9_-]+)/);
  if (match) {
    const fileId = match[1];
    return `https://drive.google.com/thumbnail?id=${fileId}&sz=w400`;
  }

  return url;
}

/**
 * 測試 API 連線
 */
export async function testConnection(): Promise<boolean> {
  try {
    const data = await fetchSheetData(SHEETS.PRODUCT_MASTER);
    console.log('Google Sheets connection successful. Rows:', data.length);
    return true;
  } catch (error) {
    console.error('Google Sheets connection failed:', error);
    return false;
  }
}
