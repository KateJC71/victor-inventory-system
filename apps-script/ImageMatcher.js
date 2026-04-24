/**
 * Victor 商品画像 自動配對腳本
 * 
 * 功能：掃描 Google Drive 資料夾裡的所有商品照片，
 *       自動比對 Google Sheet 的 model_name 和 color_code，
 *       把照片連結填入 image_filename 欄位（M欄）
 * 
 * 配對邏輯：
 *   1. 先嘗試「model_name + 空格 + color_code」（例如 ARS-3100 I.jpg）
 *   2. 再嘗試「model_name + 連字號 + color_code」（例如 T-41000-A.jpg）
 *   3. 都配不到就退回用「model_name」（例如 ARS-3100.jpg）
 *   4. 自動掃描所有子資料夾（ラケット、衣服、鞋子等）
 */

// ========== 設定區 ==========
const CONFIG = {
  SPREADSHEET_ID: '1kp7vIMASk2-2447HnNKyNYcNmcpB4c-Bj0XdwRAPb2I',
  SHEET_NAME: 'Product list',  // 如果工作表名稱不同，請修改這裡
  DRIVE_FOLDER_ID: '1P__5FJ_aqsXWoiWi9SCsrOxmr3BPQ0ej',
  
  // 欄位位置（1-based）
  COL_MODEL_NAME: 5,    // E欄：model_name
  COL_COLOR_CODE: 7,    // G欄：color_code
  COL_IMAGE: 13,        // M欄：image_filename
  
  HEADER_ROW: 1,        // 標題列
  DATA_START_ROW: 2,    // 資料開始列
};

// ========== 主要功能 ==========

/**
 * 主函數：自動配對所有商品照片
 * 從選單或手動執行
 */
function matchAllImages() {
  const ss = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
  let sheet = ss.getSheetByName(CONFIG.SHEET_NAME);
  
  // 如果找不到指定的工作表，嘗試用第一個工作表
  if (!sheet) {
    sheet = ss.getSheets()[0];
    Logger.log('找不到 "' + CONFIG.SHEET_NAME + '"，使用第一個工作表: ' + sheet.getName());
  }
  
  const lastRow = sheet.getLastRow();
  if (lastRow < CONFIG.DATA_START_ROW) {
    SpreadsheetApp.getUi().alert('工作表中沒有資料！');
    return;
  }
  
  // Step 1: 掃描 Drive 資料夾，建立照片索引
  Logger.log('=== 開始掃描 Drive 資料夾 ===');
  const imageIndex = buildImageIndex(CONFIG.DRIVE_FOLDER_ID);
  Logger.log('共找到 ' + Object.keys(imageIndex).length + ' 張照片');
  
  // Step 2: 讀取 Sheet 資料
  const dataRange = sheet.getRange(CONFIG.DATA_START_ROW, 1, lastRow - CONFIG.HEADER_ROW, CONFIG.COL_IMAGE);
  const data = dataRange.getValues();
  
  // Step 3: 配對照片
  let matchCount = 0;
  let colorMatchCount = 0;
  let modelMatchCount = 0;
  let fuzzyMatchCount = 0;
  let noMatchCount = 0;
  let skippedCount = 0;
  const imageLinks = [];
  
  for (let i = 0; i < data.length; i++) {
    const modelName = String(data[i][CONFIG.COL_MODEL_NAME - 1]).trim();
    const colorCode = String(data[i][CONFIG.COL_COLOR_CODE - 1]).trim();
    const existingImage = String(data[i][CONFIG.COL_IMAGE - 1]).trim();
    
    // 如果已經有連結，跳過
    if (existingImage && existingImage !== '' && existingImage !== 'undefined') {
      imageLinks.push([existingImage]);
      skippedCount++;
      continue;
    }
    
    // 如果沒有 model_name，跳過
    if (!modelName || modelName === '' || modelName === 'undefined') {
      imageLinks.push(['']);
      continue;
    }
    
    // 配對邏輯
    let matchedLink = '';
    
    // 優先嘗試: model_name + color_code（兩種分隔符號都試）
    if (colorCode && colorCode !== '' && colorCode !== 'undefined') {
      // 嘗試 1a: 空格分隔（例如 "ARS-3100 I" → 球拍類）
      const keySpace = (modelName + ' ' + colorCode).toUpperCase();
      // 嘗試 1b: 連字號分隔（例如 "T-41000-A" → 衣服類）
      const keyHyphen = (modelName + '-' + colorCode).toUpperCase();
      
      if (imageIndex[keySpace]) {
        matchedLink = imageIndex[keySpace];
        colorMatchCount++;
        matchCount++;
      } else if (imageIndex[keyHyphen]) {
        matchedLink = imageIndex[keyHyphen];
        colorMatchCount++;
        matchCount++;
      }
    }
    
    // 退回嘗試 2: 只用 model_name（例如 "ARS-3100.jpg"）
    if (!matchedLink) {
      const keyModelOnly = modelName.toUpperCase();
      if (imageIndex[keyModelOnly]) {
        matchedLink = imageIndex[keyModelOnly];
        modelMatchCount++;
        matchCount++;
      }
    }
    
    // 退回嘗試 3: 找任何同 model_name 的照片（不同顏色也行）
    // 例如只有 ARS-3100 I.jpg，但 ARS-3100 A/M/R 都可以共用
    if (!matchedLink) {
      const prefix = modelName.toUpperCase();
      for (const key in imageIndex) {
        // key 以 model_name 開頭（後面接空格、連字號或結束）
        if (key === prefix || key.startsWith(prefix + ' ') || key.startsWith(prefix + '-')) {
          matchedLink = imageIndex[key];
          fuzzyMatchCount++;
          matchCount++;
          break;
        }
      }
    }
    
    if (!matchedLink) {
      noMatchCount++;
    }
    
    imageLinks.push([matchedLink]);
  }
  
  // Step 4: 批次寫入 Sheet
  if (imageLinks.length > 0) {
    const writeRange = sheet.getRange(CONFIG.DATA_START_ROW, CONFIG.COL_IMAGE, imageLinks.length, 1);
    writeRange.setValues(imageLinks);
  }
  
  // Step 5: 顯示結果
  const summary = '✅ 配對完成！\n\n' +
    '📊 結果統計：\n' +
    '・總資料筆數：' + data.length + '\n' +
    '・成功配對：' + matchCount + ' 筆\n' +
    '  - 精準配對（型號+顏色）：' + colorMatchCount + ' 筆\n' +
    '  - 型號配對（無顏色）：' + modelMatchCount + ' 筆\n' +
    '  - 模糊配對（同型號不同色）：' + fuzzyMatchCount + ' 筆\n' +
    '・未找到照片：' + noMatchCount + ' 筆\n' +
    '・已有連結（跳過）：' + skippedCount + ' 筆';
  
  Logger.log(summary);
  SpreadsheetApp.getUi().alert(summary);
}

/**
 * 掃描 Drive 資料夾及所有子資料夾，建立照片檔名 → 連結的索引
 * Key: 檔名（不含副檔名，大寫）
 * Value: Google Drive 分享連結
 */
function buildImageIndex(folderId) {
  const index = {};
  const folder = DriveApp.getFolderById(folderId);
  
  // 掃描當前資料夾的檔案
  scanFolder(folder, index);
  
  // 遞迴掃描子資料夾
  scanSubFolders(folder, index);
  
  return index;
}

/**
 * 掃描單一資料夾中的圖片檔案
 */
function scanFolder(folder, index) {
  const imageTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
  const files = folder.getFiles();
  
  while (files.hasNext()) {
    const file = files.next();
    const mimeType = file.getMimeType();
    
    // 只處理圖片檔案
    if (imageTypes.indexOf(mimeType) === -1) continue;
    
    const fileName = file.getName();
    const fileId = file.getId();
    const link = 'https://drive.google.com/file/d/' + fileId;
    
    // 移除副檔名，取得純檔名作為 key
    const nameWithoutExt = fileName.replace(/\.(jpg|jpeg|png|gif|webp)$/i, '').trim();
    const key = nameWithoutExt.toUpperCase();
    
    index[key] = link;
    Logger.log('索引: ' + key + ' → ' + fileName);
  }
}

/**
 * 遞迴掃描所有子資料夾
 */
function scanSubFolders(parentFolder, index) {
  const subFolders = parentFolder.getFolders();
  
  while (subFolders.hasNext()) {
    const subFolder = subFolders.next();
    Logger.log('掃描子資料夾: ' + subFolder.getName());
    
    scanFolder(subFolder, index);
    scanSubFolders(subFolder, index); // 遞迴
  }
}

// ========== 工具功能 ==========

/**
 * 只配對空白欄位（不覆蓋已有連結的）
 * 這是預設行為，跟 matchAllImages 一樣
 */
function matchEmptyOnly() {
  matchAllImages(); // 已內建跳過已有連結的邏輯
}

/**
 * 強制重新配對所有（包括已有連結的）
 */
function rematchAll() {
  const ss = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
  let sheet = ss.getSheetByName(CONFIG.SHEET_NAME);
  if (!sheet) sheet = ss.getSheets()[0];
  
  const lastRow = sheet.getLastRow();
  
  // 先清空 M 欄
  if (lastRow >= CONFIG.DATA_START_ROW) {
    sheet.getRange(CONFIG.DATA_START_ROW, CONFIG.COL_IMAGE, lastRow - CONFIG.HEADER_ROW, 1).clearContent();
  }
  
  // 重新配對
  matchAllImages();
}

/**
 * 檢視未配對的商品清單
 */
function showUnmatched() {
  const ss = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
  let sheet = ss.getSheetByName(CONFIG.SHEET_NAME);
  if (!sheet) sheet = ss.getSheets()[0];
  
  const lastRow = sheet.getLastRow();
  const data = sheet.getRange(CONFIG.DATA_START_ROW, 1, lastRow - CONFIG.HEADER_ROW, CONFIG.COL_IMAGE).getValues();
  
  const unmatched = [];
  for (let i = 0; i < data.length; i++) {
    const sku = String(data[i][0]).trim();
    const modelName = String(data[i][CONFIG.COL_MODEL_NAME - 1]).trim();
    const colorCode = String(data[i][CONFIG.COL_COLOR_CODE - 1]).trim();
    const imageLink = String(data[i][CONFIG.COL_IMAGE - 1]).trim();
    
    if ((!imageLink || imageLink === '' || imageLink === 'undefined') && modelName) {
      unmatched.push('Row ' + (i + CONFIG.DATA_START_ROW) + ': ' + sku + ' (' + modelName + ' ' + colorCode + ')');
    }
  }
  
  if (unmatched.length === 0) {
    SpreadsheetApp.getUi().alert('🎉 所有商品都已配對照片！');
  } else {
    const msg = '📋 未配對的商品（共 ' + unmatched.length + ' 筆）：\n\n' + 
                unmatched.slice(0, 50).join('\n') +
                (unmatched.length > 50 ? '\n\n... 還有 ' + (unmatched.length - 50) + ' 筆' : '');
    SpreadsheetApp.getUi().alert(msg);
  }
}

/**
 * 預覽 Drive 資料夾中的照片（不寫入）
 */
function previewDriveImages() {
  const imageIndex = buildImageIndex(CONFIG.DRIVE_FOLDER_ID);
  const keys = Object.keys(imageIndex).sort();
  
  const msg = '📸 Drive 資料夾中的照片（共 ' + keys.length + ' 張）：\n\n' +
              keys.slice(0, 80).join('\n') +
              (keys.length > 80 ? '\n\n... 還有 ' + (keys.length - 80) + ' 張' : '');
  
  Logger.log(msg);
  SpreadsheetApp.getUi().alert(msg);
}

/**
 * 產出缺照片的型號清單（去重複），寫到新的工作表
 * 這些型號需要從 Victor 官網下載照片
 */
function listMissingModels() {
  const ss = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
  let sheet = ss.getSheetByName(CONFIG.SHEET_NAME);
  if (!sheet) sheet = ss.getSheets()[0];
  
  const lastRow = sheet.getLastRow();
  const data = sheet.getRange(CONFIG.DATA_START_ROW, 1, lastRow - CONFIG.HEADER_ROW, CONFIG.COL_IMAGE).getValues();
  
  // 建立 Drive 照片索引
  const imageIndex = buildImageIndex(CONFIG.DRIVE_FOLDER_ID);
  
  // 收集缺照片的不重複 model_name
  const missingModels = {};
  const COL_MASTER_NAME = 3; // C欄：Master_Name
  
  for (let i = 0; i < data.length; i++) {
    const masterName = String(data[i][COL_MASTER_NAME - 1]).trim();
    const modelName = String(data[i][CONFIG.COL_MODEL_NAME - 1]).trim();
    const colorCode = String(data[i][CONFIG.COL_COLOR_CODE - 1]).trim();
    const imageLink = String(data[i][CONFIG.COL_IMAGE - 1]).trim();
    
    if (imageLink && imageLink !== '' && imageLink !== 'undefined') continue;
    if (!modelName || modelName === '' || modelName === 'undefined') continue;
    
    // 用 model_name 作為 key 去重複
    if (!missingModels[modelName]) {
      missingModels[modelName] = {
        model: modelName,
        masterName: masterName,
        colors: [],
        searchUrl: 'https://www.victorsport.com.tw/search?q=' + encodeURIComponent(modelName)
      };
    }
    if (colorCode && missingModels[modelName].colors.indexOf(colorCode) === -1) {
      missingModels[modelName].colors.push(colorCode);
    }
  }
  
  // 寫到新的工作表
  const outputSheetName = '缺照片型號清單';
  let outputSheet = ss.getSheetByName(outputSheetName);
  if (outputSheet) {
    outputSheet.clear();
  } else {
    outputSheet = ss.insertSheet(outputSheetName);
  }
  
  // 寫入標題
  outputSheet.getRange(1, 1, 1, 5).setValues([['model_name', 'Master_Name', 'color_codes', 'search_url', '圖片URL（手動填入）']]);
  outputSheet.getRange(1, 1, 1, 5).setFontWeight('bold');
  
  // 寫入資料
  const models = Object.values(missingModels).sort((a, b) => a.model.localeCompare(b.model));
  const outputData = models.map(m => [
    m.model,
    m.masterName,
    m.colors.join(', '),
    m.searchUrl,
    ''
  ]);
  
  if (outputData.length > 0) {
    outputSheet.getRange(2, 1, outputData.length, 5).setValues(outputData);
  }
  
  // 調整欄寬
  outputSheet.autoResizeColumns(1, 5);
  
  const msg = '📋 缺照片型號清單已產出！\n\n' +
    '・共 ' + models.length + ' 個不同型號需要照片\n' +
    '・已寫入工作表「' + outputSheetName + '」\n' +
    '・C 欄有台灣官網搜尋連結，可以直接點開找照片';
  
  SpreadsheetApp.getUi().alert(msg);
}

// ========== 選單 ==========

/**
 * 建立自訂選單
 */
function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('📸 商品照片配對')
    .addItem('▶ 自動配對照片（空白欄位）', 'matchAllImages')
    .addItem('🔄 重新配對所有照片', 'rematchAll')
    .addSeparator()
    .addItem('📋 查看未配對的商品', 'showUnmatched')
    .addItem('🔍 產出缺照片型號清單', 'listMissingModels')
    .addItem('📂 預覽 Drive 照片清單', 'previewDriveImages')
    .addToUi();
}