/**
 * 【預覽腳本】掃描 Drive 照片並配對到 Sheet 商品
 *
 * 這個腳本「只看不改」——不會動你的 Sheet 任何資料
 * 目的：確認有幾張照片、能配對到多少商品
 *
 * 使用方式：
 * 1. 複製整個檔案內容
 * 2. 貼到 Google Apps Script 編輯器的新檔案
 * 3. 執行 previewImageMatching 函數
 * 4. 看「執行記錄」（View → Logs 或 Ctrl+Enter）
 * 5. 把最後的結果貼給 Claude
 */

const PREVIEW_CONFIG = {
  SPREADSHEET_ID: '1CSCXZNC6xJmqpfV7uEtvsYXo0mv2Ew7ZgESEyn5GVc0',
  SHEET_NAME: 'Product_Master',
  DRIVE_FOLDER_ID: '1P__5FJ_aqsXWoiWi9SCsrOxmr3BPQ0ej',
  COL_MODEL_NAME: 5,   // E欄
  COL_COLOR_CODE: 7,   // G欄
  COL_IMAGE: 13,       // M欄
  DATA_START_ROW: 2,
};

function previewImageMatching() {
  const startTime = new Date();
  Logger.log('=== 開始預覽（只看不改）===');
  Logger.log('時間：' + startTime);
  Logger.log('');

  // Step 1: 掃描 Drive 資料夾
  Logger.log('>>> Step 1: 掃描 Drive 資料夾 <<<');
  const folder = DriveApp.getFolderById(PREVIEW_CONFIG.DRIVE_FOLDER_ID);
  Logger.log('資料夾名稱：' + folder.getName());

  const imageIndex = {};
  const subfolderStats = {};
  scanFolderRecursive(folder, imageIndex, subfolderStats, '');

  const totalImages = Object.keys(imageIndex).length;
  Logger.log('');
  Logger.log('總共找到照片：' + totalImages + ' 張');
  Logger.log('各子資料夾分布：');
  Object.keys(subfolderStats).forEach(function(path) {
    Logger.log('  ' + path + '：' + subfolderStats[path] + ' 張');
  });

  // Step 2: 讀取 Sheet
  Logger.log('');
  Logger.log('>>> Step 2: 讀取 Product_Master <<<');
  const ss = SpreadsheetApp.openById(PREVIEW_CONFIG.SPREADSHEET_ID);
  const sheet = ss.getSheetByName(PREVIEW_CONFIG.SHEET_NAME);
  const lastRow = sheet.getLastRow();
  const data = sheet.getRange(
    PREVIEW_CONFIG.DATA_START_ROW,
    1,
    lastRow - 1,
    PREVIEW_CONFIG.COL_IMAGE
  ).getValues();
  Logger.log('總商品數：' + data.length);

  // Step 3: 配對
  Logger.log('');
  Logger.log('>>> Step 3: 配對測試 <<<');
  let matchExact = 0;
  let matchModelOnly = 0;
  let matchFuzzy = 0;
  let noMatch = 0;
  const unmatchedSamples = [];

  for (let i = 0; i < data.length; i++) {
    const row = data[i];
    const modelName = String(row[PREVIEW_CONFIG.COL_MODEL_NAME - 1]).trim();
    const colorCode = String(row[PREVIEW_CONFIG.COL_COLOR_CODE - 1]).trim();
    const sku = String(row[0]).trim();

    if (!modelName) continue;

    const upperModel = modelName.toUpperCase();
    const upperColor = colorCode.toUpperCase();
    let matched = false;

    // 嘗試 1a：model + 空格 + color
    if (colorCode && imageIndex[upperModel + ' ' + upperColor]) {
      matchExact++;
      matched = true;
    }
    // 嘗試 1b：model + 連字號 + color
    else if (colorCode && imageIndex[upperModel + '-' + upperColor]) {
      matchExact++;
      matched = true;
    }
    // 嘗試 2：純 model
    else if (imageIndex[upperModel]) {
      matchModelOnly++;
      matched = true;
    }
    // 嘗試 3：模糊配對（任何以 model 開頭的檔名）
    else {
      for (const key in imageIndex) {
        if (key === upperModel ||
            key.indexOf(upperModel + ' ') === 0 ||
            key.indexOf(upperModel + '-') === 0) {
          matchFuzzy++;
          matched = true;
          break;
        }
      }
    }

    if (!matched) {
      noMatch++;
      if (unmatchedSamples.length < 20) {
        unmatchedSamples.push(sku + ' (' + modelName + (colorCode ? ' / ' + colorCode : '') + ')');
      }
    }
  }

  // Step 4: 報告結果
  Logger.log('');
  Logger.log('=====================================');
  Logger.log('📊 配對結果總整理');
  Logger.log('=====================================');
  Logger.log('Drive 總照片數：' + totalImages);
  Logger.log('Sheet 總商品數：' + data.length);
  Logger.log('');
  Logger.log('✅ 精準配對（型號+顏色）：' + matchExact);
  Logger.log('✅ 型號配對（無顏色）：' + matchModelOnly);
  Logger.log('⚠️  模糊配對（同型號任意色）：' + matchFuzzy);
  Logger.log('❌ 完全找不到照片：' + noMatch);
  Logger.log('');
  Logger.log('合計配對成功：' + (matchExact + matchModelOnly + matchFuzzy) + ' / ' + data.length);
  Logger.log('');

  if (unmatchedSamples.length > 0) {
    Logger.log('❌ 找不到照片的商品範例（最多 20 筆）：');
    unmatchedSamples.forEach(function(s) {
      Logger.log('  - ' + s);
    });
  }

  const endTime = new Date();
  Logger.log('');
  Logger.log('耗時：' + Math.round((endTime - startTime) / 1000) + ' 秒');
  Logger.log('=== 預覽完成 ===');
}

function scanFolderRecursive(folder, imageIndex, stats, pathPrefix) {
  const imageMimes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
  const currentPath = pathPrefix + (pathPrefix ? '/' : '') + folder.getName();
  stats[currentPath] = 0;

  const files = folder.getFiles();
  while (files.hasNext()) {
    const file = files.next();
    if (imageMimes.indexOf(file.getMimeType()) === -1) continue;
    const name = file.getName();
    const nameWithoutExt = name.replace(/\.(jpg|jpeg|png|gif|webp)$/i, '').trim();
    const key = nameWithoutExt.toUpperCase();
    imageIndex[key] = {
      fileId: file.getId(),
      fileName: name,
      folder: currentPath
    };
    stats[currentPath]++;
  }

  const subFolders = folder.getFolders();
  while (subFolders.hasNext()) {
    scanFolderRecursive(subFolders.next(), imageIndex, stats, currentPath);
  }
}
