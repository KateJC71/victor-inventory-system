// 資料服務 - 合併 Product_Master 和 Inventory_Raw
import { Product, CategoryType } from '../types';
import {
  fetchProductMaster,
  fetchInventoryRaw,
  convertGoogleDriveUrl,
  ProductMasterRow,
  InventoryRawRow,
} from './googleSheets';

/**
 * 將 Google Sheets 的分類名稱轉換為 CategoryType
 */
function mapCategory(categoryName: string): CategoryType {
  const categoryMap: Record<string, CategoryType> = {
    'ラケット': CategoryType.Racket,
    'シューズ': CategoryType.Shoes,
    'アパレル': CategoryType.Apparel,
    'バッグ': CategoryType.Bag,
    'グリップ': CategoryType.Grip,
    'ストリング': CategoryType.String,
    'シャトル': CategoryType.Shuttle,
    'その他': CategoryType.Others,
    '小物': CategoryType.Others, // 小物 maps to Others
  };

  return categoryMap[categoryName] || CategoryType.Others;
}

/**
 * 從 Google Sheets 讀取並合併商品資料
 */
export async function fetchProductsFromSheets(): Promise<Product[]> {
  try {
    // 同時讀取兩個工作表
    const [productMaster, inventoryRaw] = await Promise.all([
      fetchProductMaster(),
      fetchInventoryRaw(),
    ]);

    console.log(`Fetched ${productMaster.length} products from Product_Master`);
    console.log(`Fetched ${inventoryRaw.length} inventory records from Inventory_Raw`);

    // 建立庫存資料的 Map (以 SKU 為 key)
    const inventoryMap = new Map<string, InventoryRawRow>();
    inventoryRaw.forEach(inv => {
      inventoryMap.set(inv.sku, inv);
    });

    // 合併資料
    const products: Product[] = productMaster.map(pm => {
      const inventory = inventoryMap.get(pm.sku);

      return {
        sku: pm.sku,
        name: pm.masterName || pm.sku,
        modelName: pm.modelName || '',
        category: mapCategory(pm.category),
        subCategory: pm.subCategory || '',
        color: pm.color || pm.colorCode || '',
        size: pm.size || '',
        gender: pm.gender || '',
        weightClass: pm.weightClass || '',
        gripSize: pm.gripSize || '',
        price: inventory?.price || 0,
        stock: inventory?.stock || 0,
        imageUrl: convertGoogleDriveUrl(pm.imageFilename) || '',
      };
    });

    console.log(`Merged ${products.length} products`);
    return products;
  } catch (error) {
    console.error('Failed to fetch products from Google Sheets:', error);
    throw error;
  }
}

/**
 * 重新載入資料（用於上傳後更新）
 */
export async function refreshProductData(): Promise<Product[]> {
  return fetchProductsFromSheets();
}

/**
 * 檢查資料來源是否可用
 */
export async function checkDataSource(): Promise<{
  available: boolean;
  productCount: number;
  inventoryCount: number;
  error?: string;
}> {
  try {
    const [productMaster, inventoryRaw] = await Promise.all([
      fetchProductMaster(),
      fetchInventoryRaw(),
    ]);

    return {
      available: true,
      productCount: productMaster.length,
      inventoryCount: inventoryRaw.length,
    };
  } catch (error) {
    return {
      available: false,
      productCount: 0,
      inventoryCount: 0,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}
