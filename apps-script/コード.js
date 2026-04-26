/**
 * Google Apps Script - Victor Inventory System
 *
 * === 既有功能 ===
 * - processExcelUpload()：從 Google Drive 抓 Excel 寫入 Inventory_Raw
 * - updateImageUrls()：自動比對圖片填入 Product_Master M 欄
 *
 * === 新增功能 ===
 * - doPost()：接收前端 POST 請求，將未登錄商品寫入 Product_Master
 * - doGet()：測試 API 是否正常
 *
 * === 部署步驟 ===
 * 1. 打開你的 Google Spreadsheet → 「擴充功能」 → 「Apps Script」
 * 2. 用這個檔案的內容「取代」原本的 Code.gs
 * 3. 點擊 「部署」 → 「新增部署作業」
 * 4. 類型選擇 「網頁應用程式」
 * 5. 設定：
 *    - 執行身份：「我」(Me)
 *    - 存取權限：「所有人」(Anyone)
 * 6. 點擊 「部署」
 * 7. 複製產生的 URL（格式類似 https://script.google.com/macros/s/xxxxx/exec）
 * 8. 將此 URL 設定為環境變數 VITE_GOOGLE_APPS_SCRIPT_URL
 *    - Vercel：加到 Environment Variables
 */

// ==========================================
// 庫存系統設定區 (請勿更動 ID 以外的部分)
// ==========================================
// 1. Excel 上傳資料夾 ID
const FOLDER_ID_UPLOADS = '1hpVWbkkn4l6FLhiPyDuUoFSstZofjNhN';
// 2. 圖片資料夾 ID
const FOLDER_ID_IMAGES = '1-GDNlTzdZSN71Yvwld9JCA74xy6yXU7G';
// 3. Google Sheet 分頁名稱設定
const SHEET_NAME_INVENTORY = 'Inventory_Raw';
const SHEET_NAME_LOGS = 'Upload_Logs';
const SHEET_NAME_MASTER = 'Product_Master';

// ==========================================
// 既有功能：處理 Excel 匯入
// ==========================================
function processExcelUpload() {
  const ss = SpreadsheetApp.openById('1CSCXZNC6xJmqpfV7uEtvsYXo0mv2Ew7ZgESEyn5GVc0');
  const logSheet = ss.getSheetByName(SHEET_NAME_LOGS);

  try {
    const folder = DriveApp.getFolderById(FOLDER_ID_UPLOADS);
    const files = folder.getFilesByType(MimeType.MICROSOFT_EXCEL);

    let newestFile = null;
    let newestDate = new Date(0);
    while (files.hasNext()) {
      let file = files.next();
      if (file.getLastUpdated() > newestDate) {
        newestDate = file.getLastUpdated();
        newestFile = file;
      }
    }
    if (!newestFile) {
      console.log("找不到 Excel 檔案");
      return;
    }

    console.log("開始處理檔案: " + newestFile.getName());

    const blob = newestFile.getBlob();
    const resource = {
      title: "[TEMP] " + newestFile.getName(),
      mimeType: MimeType.GOOGLE_SHEETS
    };

    const tempFile = Drive.Files.insert(resource, blob);
    const tempSpreadsheet = SpreadsheetApp.openById(tempFile.id);
    const tempSheet = tempSpreadsheet.getSheets()[0];
    const data = tempSheet.getDataRange().getValues();
    Drive.Files.remove(tempFile.id);

    const targetData = [];
    const timestamp = new Date();

    for (let i = 1; i < data.length; i++) {
      let row = data[i];
      let sku = row[2];
      if (!sku) continue;
      let name = row[3];
      let price = row[4];
      let stock = row[5];
      let warehouse = row[0];

      targetData.push([
        sku,
        name,
        stock,
        price,
        warehouse,
        timestamp
      ]);
    }

    const invSheet = ss.getSheetByName(SHEET_NAME_INVENTORY);
    if (invSheet.getLastRow() > 1) {
      invSheet.getRange(2, 1, invSheet.getLastRow() - 1, invSheet.getLastColumn()).clearContent();
    }
    if (targetData.length > 0) {
      invSheet.getRange(2, 1, targetData.length, targetData[0].length).setValues(targetData);
    }

    console.log("庫存更新成功，共更新 " + targetData.length + " 筆");

    logSheet.appendRow([
      new Date().getTime().toString(),
      new Date(),
      Session.getActiveUser().getEmail(),
      newestFile.getName(),
      "Success",
      targetData.length
    ]);
  } catch (e) {
    console.error("發生錯誤: " + e.toString());
    logSheet.appendRow([
      new Date().getTime().toString(),
      new Date(),
      "System",
      "Error",
      "Fail: " + e.toString(),
      0
    ]);
  }
}

// ==========================================
// 既有功能：自動抓取圖片連結並填入 Product_Master
// ==========================================
function updateImageUrls() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const masterSheet = ss.getSheetByName('Product_Master');

  const lastRow = masterSheet.getLastRow();
  if (lastRow <= 1) return;

  const range = masterSheet.getRange(2, 1, lastRow - 1, 13);
  const values = range.getValues();

  const folder = DriveApp.getFolderById(FOLDER_ID_IMAGES);
  const files = folder.getFiles();
  const imageMap = {};

  while (files.hasNext()) {
    let file = files.next();
    let fileUrl = "https://drive.google.com/thumbnail?sz=w500&id=" + file.getId();
    imageMap[file.getName()] = fileUrl;
  }

  let updateCount = 0;
  for (let i = 0; i < values.length; i++) {
    let sku = values[i][0];
    let jpgName = sku + ".jpg";
    let pngName = sku + ".png";

    if (imageMap[jpgName]) {
      values[i][12] = imageMap[jpgName];
      updateCount++;
    } else if (imageMap[pngName]) {
      values[i][12] = imageMap[pngName];
      updateCount++;
    } else {
      values[i][12] = "";
    }
  }

  const urlColumn = values.map(row => [row[12]]);
  masterSheet.getRange(2, 13, lastRow - 1, 1).setValues(urlColumn);

  console.log("已更新圖片連結，共 " + updateCount + " 筆");
}

// ==========================================
// 新增功能：Web App API（前端呼叫用）
// ==========================================

/**
 * 處理 POST 請求 - 前端上傳未登錄商品時呼叫
 */
function doPost(e) {
  try {
    var data = JSON.parse(e.postData.contents);

    if (data.action === 'addUnregistered') {
      return handleAddUnregistered(data.products);
    }

    if (data.action === 'addProduct') {
      return handleAddProduct(data.product);
    }

    if (data.action === 'addProductsBatch') {
      return handleAddProductsBatch(data.products);
    }

    if (data.action === 'replaceInventory') {
      return handleReplaceInventory(data.rows, data.token);
    }

    return createResponse({ success: false, message: '不明なアクション: ' + data.action });
  } catch (error) {
    return createResponse({ success: false, message: 'エラー: ' + error.message });
  }
}

/**
 * 將未登錄商品加入 Product_Master
 * 寫入欄位：A列 = SKU, C列 = 商品名稱
 */
function handleAddUnregistered(products) {
  if (!products || products.length === 0) {
    return createResponse({ success: false, message: '商品データがありません' });
  }

  var sheet = SpreadsheetApp.openById('1CSCXZNC6xJmqpfV7uEtvsYXo0mv2Ew7ZgESEyn5GVc0').getSheetByName(SHEET_NAME_MASTER);
  if (!sheet) {
    return createResponse({ success: false, message: 'Product_Master シートが見つかりません' });
  }

  // 取得現有的 SKU 列表（A列），避免重複
  var lastRow = sheet.getLastRow();
  var existingSkus = {};

  if (lastRow > 1) {
    var skuRange = sheet.getRange(2, 1, lastRow - 1, 1).getValues();
    for (var i = 0; i < skuRange.length; i++) {
      if (skuRange[i][0]) {
        existingSkus[String(skuRange[i][0]).trim()] = true;
      }
    }
  }

  var added = 0;
  var skipped = 0;

  for (var j = 0; j < products.length; j++) {
    var sku = String(products[j].sku).trim();
    var productName = String(products[j].productName).trim();

    // 跳過已存在的 SKU
    if (existingSkus[sku]) {
      skipped++;
      continue;
    }

    // 建立新行：A=SKU, B=空(category), C=商品名稱
    sheet.appendRow([sku, '', productName]);
    existingSkus[sku] = true;
    added++;
  }

  return createResponse({
    success: true,
    message: added + ' 件追加しました' + (skipped > 0 ? '（' + skipped + ' 件は既に存在）' : ''),
    added: added,
    skipped: skipped
  });
}

/**
 * 處理 GET 請求（測試用）
 */
function doGet(e) {
  return createResponse({ success: true, message: 'Victor Inventory API is running' });
}

/**
 * 建立 JSON 回應
 */
function createResponse(data) {
  return ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}

/**
 * 新增完整商品到 Product_Master + Inventory_Raw
 * payload 範例：
 * {
 *   sku, modelName, name, category, masterName, subCategory,
 *   color, colorCode, size, price, stock, imageUrl,
 *   gender, weightClass, gripSize, remarks
 * }
 */
function handleAddProduct(p) {
  if (!p || !p.sku) {
    return createResponse({ success: false, message: 'SKU が必要です' });
  }

  var ss = SpreadsheetApp.openById('1CSCXZNC6xJmqpfV7uEtvsYXo0mv2Ew7ZgESEyn5GVc0');
  var masterSheet = ss.getSheetByName(SHEET_NAME_MASTER);
  if (!masterSheet) {
    return createResponse({ success: false, message: 'Product_Master シートが見つかりません' });
  }

  // 檢查 SKU 是否已存在
  var lastRow = masterSheet.getLastRow();
  if (lastRow > 1) {
    var skuRange = masterSheet.getRange(2, 1, lastRow - 1, 1).getValues();
    for (var i = 0; i < skuRange.length; i++) {
      if (String(skuRange[i][0]).trim() === String(p.sku).trim()) {
        return createResponse({
          success: false,
          message: 'SKU「' + p.sku + '」は既に存在します'
        });
      }
    }
  }

  // 寫入 Product_Master（13 欄）
  // A=sku, B=category, C=masterName, D=subCategory, E=modelName,
  // F=gender, G=colorCode, H=color, I=size, J=weightClass,
  // K=gripSize, L=remarks, M=imageUrl
  masterSheet.appendRow([
    p.sku || '',
    p.category || '',
    p.masterName || '',
    p.subCategory || '',
    p.modelName || '',
    p.gender || '',
    p.colorCode || p.color || '',
    p.color || '',
    p.size || '',
    p.weightClass || '',
    p.gripSize || '',
    p.remarks || '',
    p.imageUrl || ''
  ]);

  // 寫入 Inventory_Raw（如果有 name/price/stock）
  if (p.name || p.price || p.stock) {
    var invSheet = ss.getSheetByName(SHEET_NAME_INVENTORY);
    if (invSheet) {
      invSheet.appendRow([
        p.sku,
        p.name || '',
        Number(p.stock) || 0,
        Number(p.price) || 0,
        '',  // 倉庫コード
        new Date()
      ]);
    }
  }

  return createResponse({
    success: true,
    message: '商品「' + p.sku + '」を登録しました',
    sku: p.sku
  });
}

/**
 * 批次新增商品（Excel 一次上傳多筆用）
 * payload: products: Array<{sku, modelName, category, subCategory, gender, color, colorCode, size, weightClass, gripSize, price, stock, imageUrl, remarks}>
 *
 * 行為：
 * - SKU 已存在的跳過（不覆蓋）
 * - Master_Name 自動用 SKU 填入
 * - 同時寫入 Product_Master (13 欄) 和 Inventory_Raw (6 欄)
 * - 使用批次寫入避免 6 分鐘逾時
 */
function handleAddProductsBatch(products) {
  if (!products || !Array.isArray(products) || products.length === 0) {
    return createResponse({ success: false, message: '商品データがありません' });
  }

  var ss = SpreadsheetApp.openById('1CSCXZNC6xJmqpfV7uEtvsYXo0mv2Ew7ZgESEyn5GVc0');
  var masterSheet = ss.getSheetByName(SHEET_NAME_MASTER);
  if (!masterSheet) {
    return createResponse({ success: false, message: 'Product_Master シートが見つかりません' });
  }

  // 取得既有 SKU 清單（大寫去空白）
  var lastRow = masterSheet.getLastRow();
  var existingSkus = {};
  if (lastRow > 1) {
    var skuRange = masterSheet.getRange(2, 1, lastRow - 1, 1).getValues();
    for (var i = 0; i < skuRange.length; i++) {
      if (skuRange[i][0]) {
        existingSkus[String(skuRange[i][0]).trim().toUpperCase()] = true;
      }
    }
  }

  var toAddMaster = [];
  var toAddInventory = [];
  var skipped = 0;
  var skippedSkus = [];
  var now = new Date();

  for (var j = 0; j < products.length; j++) {
    var p = products[j];
    var sku = String(p.sku || '').trim();
    if (!sku) continue;
    var skuUpper = sku.toUpperCase();
    if (existingSkus[skuUpper]) {
      skipped++;
      if (skippedSkus.length < 20) skippedSkus.push(sku);
      continue;
    }

    toAddMaster.push([
      sku,
      p.category || '',
      sku,  // Master_Name = SKU
      p.subCategory || '',
      p.modelName || '',
      p.gender || '',
      p.colorCode || p.color || '',
      p.color || '',
      p.size || '',
      p.weightClass || '',
      p.gripSize || '',
      p.remarks || '',
      p.imageUrl || ''
    ]);

    toAddInventory.push([
      sku,
      sku,  // name = SKU
      Number(p.stock) || 0,
      Number(p.price) || 0,
      '',
      now
    ]);

    existingSkus[skuUpper] = true; // 同檔案內重複也擋掉
  }

  // 批次寫入（比一行一行 appendRow 快非常多）
  if (toAddMaster.length > 0) {
    masterSheet.getRange(masterSheet.getLastRow() + 1, 1, toAddMaster.length, 13).setValues(toAddMaster);
  }

  var invSheet = ss.getSheetByName(SHEET_NAME_INVENTORY);
  if (invSheet && toAddInventory.length > 0) {
    invSheet.getRange(invSheet.getLastRow() + 1, 1, toAddInventory.length, 6).setValues(toAddInventory);
  }

  return createResponse({
    success: true,
    added: toAddMaster.length,
    skipped: skipped,
    skippedSkus: skippedSkus,
    message: toAddMaster.length + ' 件追加しました' + (skipped > 0 ? '（' + skipped + ' 件は既存のためスキップ）' : '')
  });
}
/**
 * 完全置換 Inventory_Raw（用於每日自動更新庫存）
 * payload: rows: Array<{sku, productName, stock, price, warehouseCode}>, token: string
 *
 * Token 必須跟 Script Properties 中的 AUTO_UPDATE_TOKEN 相符，
 * 防止任意網路請求修改你的庫存資料。
 *
 * 行為：
 * 1. 驗證 token
 * 2. 清空 Inventory_Raw 第 2 列以下所有資料
 * 3. 批次寫入新資料（A=SKU, B=商品名, C=在庫数, D=価格, E=倉庫, F=更新時刻）
 */
function handleReplaceInventory(rows, token) {
  var props = PropertiesService.getScriptProperties();
  var expected = props.getProperty('AUTO_UPDATE_TOKEN');
  if (!expected || token !== expected) {
    return createResponse({ success: false, message: '認証失敗' });
  }

  if (!rows || !Array.isArray(rows) || rows.length === 0) {
    return createResponse({ success: false, message: '在庫データがありません' });
  }

  var ss = SpreadsheetApp.openById('1CSCXZNC6xJmqpfV7uEtvsYXo0mv2Ew7ZgESEyn5GVc0');
  var invSheet = ss.getSheetByName(SHEET_NAME_INVENTORY);
  if (!invSheet) {
    return createResponse({ success: false, message: 'Inventory_Raw シートが見つかりません' });
  }

  // Clear existing data rows
  var lastRow = invSheet.getLastRow();
  if (lastRow > 1) {
    invSheet.getRange(2, 1, lastRow - 1, invSheet.getLastColumn()).clearContent();
  }

  var now = new Date();
  var data = rows.map(function(r) {
    return [
      String(r.sku || '').trim(),
      String(r.productName || '').trim(),
      Number(r.stock) || 0,
      Number(r.price) || 0,
      String(r.warehouseCode || '').trim(),
      now
    ];
  }).filter(function(r) { return r[0]; });

  if (data.length > 0) {
    invSheet.getRange(2, 1, data.length, 6).setValues(data);
  }

  // Log the auto-update
  var logSheet = ss.getSheetByName(SHEET_NAME_LOGS);
  if (logSheet) {
    logSheet.appendRow([
      String(new Date().getTime()),
      now,
      'AUTO',
      'auto-stock-update',
      'Success',
      data.length
    ]);
  }

  return createResponse({
    success: true,
    rowsWritten: data.length,
    message: data.length + ' 件の在庫を更新しました'
  });
}
