/**
 * Google Apps Script - Victor Inventory System
 *
 * 用途：接收前端 POST 請求，將未登錄商品寫入 Product_Master
 *
 * === 部署步驟 ===
 * 1. 打開你的 Google Spreadsheet
 * 2. 點選 「擴充功能」 → 「Apps Script」
 * 3. 刪除預設的 Code.gs 內容，貼上這個檔案的全部程式碼
 * 4. 點擊 「部署」 → 「新增部署作業」
 * 5. 類型選擇 「網頁應用程式」
 * 6. 設定：
 *    - 執行身份：「我」(Me)
 *    - 存取權限：「所有人」(Anyone)
 * 7. 點擊 「部署」
 * 8. 複製產生的 URL（格式類似 https://script.google.com/macros/s/xxxxx/exec）
 * 9. 將此 URL 設定為環境變數 VITE_GOOGLE_APPS_SCRIPT_URL
 *    - 本地開發：加到 .env.local
 *    - Vercel：加到 Environment Variables
 */

/**
 * 處理 POST 請求
 */
function doPost(e) {
  try {
    var data = JSON.parse(e.postData.contents);

    if (data.action === 'addUnregistered') {
      return handleAddUnregistered(data.products);
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

  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Product_Master');
  if (!sheet) {
    return createResponse({ success: false, message: 'Product_Master シートが見つかりません' });
  }

  // 取得現有的 SKU 列表（A列），避免重複
  var lastRow = sheet.getLastRow();
  var existingSkus = new Set();

  if (lastRow > 1) {
    var skuRange = sheet.getRange(2, 1, lastRow - 1, 1).getValues();
    for (var i = 0; i < skuRange.length; i++) {
      if (skuRange[i][0]) {
        existingSkus.add(String(skuRange[i][0]).trim());
      }
    }
  }

  var added = 0;
  var skipped = 0;

  for (var j = 0; j < products.length; j++) {
    var sku = String(products[j].sku).trim();
    var productName = String(products[j].productName).trim();

    // 跳過已存在的 SKU
    if (existingSkus.has(sku)) {
      skipped++;
      continue;
    }

    // 建立新行：A=SKU, B=空(category), C=商品名稱
    var newRow = [sku, '', productName];
    sheet.appendRow(newRow);
    existingSkus.add(sku);
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
