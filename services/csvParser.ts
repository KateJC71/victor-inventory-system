// CSV 解析器 - 支援 Shift-JIS 編碼
// 用於解析業務上傳的庫存 CSV 檔案

export interface StockCSVRow {
  warehouseCode: string;    // 倉庫コード
  warehouseName: string;    // 倉庫名
  sku: string;              // 商品コード
  productName: string;      // 商品名
  price: number;            // 標準価格
  currentStock: number;     // 現在在庫数
  incomingStock: number;    // 入庫予定数
  outgoingStock: number;    // 出庫予定数
  plannedStock: number;     // 予定在庫数
  salesPlanned: number;     // 販売予定
  safetyStock: number;      // 安全在庫数
  spec: string;             // 仕様・規格
  stockStandard: string;    // 在庫基準
}

/**
 * 檢測檔案編碼並解碼為字串
 * 支援 Shift-JIS (日文系統常用) 和 UTF-8
 */
export async function decodeFile(file: File): Promise<string> {
  const buffer = await file.arrayBuffer();
  const bytes = new Uint8Array(buffer);

  // 嘗試 Shift-JIS 解碼
  try {
    const decoder = new TextDecoder('shift-jis');
    const text = decoder.decode(bytes);

    // 檢查是否成功解碼（日文字符應該正常顯示）
    if (text.includes('倉庫') || text.includes('商品') || text.includes('在庫')) {
      console.log('Detected encoding: Shift-JIS');
      return text;
    }
  } catch (e) {
    console.log('Shift-JIS decoding failed, trying UTF-8');
  }

  // 嘗試 UTF-8 解碼
  try {
    const decoder = new TextDecoder('utf-8');
    const text = decoder.decode(bytes);
    console.log('Using encoding: UTF-8');
    return text;
  } catch (e) {
    console.error('UTF-8 decoding failed');
    throw new Error('無法解碼檔案，請確認檔案編碼');
  }
}

/**
 * 解析 CSV 行，處理引號內的逗號
 */
function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];

    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }

  result.push(current.trim());
  return result;
}

/**
 * 解析庫存 CSV 檔案
 */
export function parseStockCSV(csvText: string): StockCSVRow[] {
  const lines = csvText.split(/\r?\n/).filter(line => line.trim());

  if (lines.length < 2) {
    throw new Error('CSV 檔案沒有資料');
  }

  // 跳過標題行
  const dataLines = lines.slice(1);
  const results: StockCSVRow[] = [];
  const errors: string[] = [];

  for (let i = 0; i < dataLines.length; i++) {
    const line = dataLines[i];
    if (!line.trim()) continue;

    try {
      const columns = parseCSVLine(line);

      // 業務上傳的 CSV 格式有 13 欄
      // 倉庫コード,倉庫名,商品コード,商品名,標準価格,現在在庫数,入庫予定数,出庫予定数,予定在庫数,販売予定,安全在庫数,仕様・規格,在庫基準
      if (columns.length < 6) {
        errors.push(`行 ${i + 2}: 欄位數量不足`);
        continue;
      }

      const row: StockCSVRow = {
        warehouseCode: columns[0] || '',
        warehouseName: columns[1] || '',
        sku: columns[2] || '',
        productName: columns[3] || '',
        price: parseInt(columns[4], 10) || 0,
        currentStock: parseInt(columns[5], 10) || 0,
        incomingStock: parseInt(columns[6], 10) || 0,
        outgoingStock: parseInt(columns[7], 10) || 0,
        plannedStock: parseInt(columns[8], 10) || 0,
        salesPlanned: parseInt(columns[9], 10) || 0,
        safetyStock: parseInt(columns[10], 10) || 0,
        spec: columns[11] || '',
        stockStandard: columns[12] || '',
      };

      // 驗證必要欄位
      if (!row.sku) {
        errors.push(`行 ${i + 2}: 商品コード 為空`);
        continue;
      }

      results.push(row);
    } catch (e) {
      errors.push(`行 ${i + 2}: 解析錯誤`);
    }
  }

  if (errors.length > 0) {
    console.warn('CSV 解析警告:', errors);
  }

  console.log(`CSV 解析完成: ${results.length} 筆成功, ${errors.length} 筆錯誤`);
  return results;
}

/**
 * 將解析的 CSV 資料轉換為庫存更新格式
 */
export function convertToInventoryUpdate(csvRows: StockCSVRow[]): Array<{
  sku: string;
  productName: string;
  stock: number;
  price: number;
  warehouseCode: string;
}> {
  return csvRows.map(row => ({
    sku: row.sku,
    productName: row.productName,
    stock: row.currentStock,
    price: row.price,
    warehouseCode: row.warehouseCode,
  }));
}

/**
 * 驗證 CSV 檔案
 */
export function validateCSVFile(file: File): { valid: boolean; error?: string } {
  // 檢查檔案類型
  if (!file.name.endsWith('.csv')) {
    return { valid: false, error: '請上傳 CSV 檔案' };
  }

  // 檢查檔案大小 (最大 10MB)
  if (file.size > 10 * 1024 * 1024) {
    return { valid: false, error: '檔案大小超過 10MB 限制' };
  }

  return { valid: true };
}
