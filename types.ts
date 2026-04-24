
export interface Product {
  sku: string;
  name: string;
  modelName: string;
  masterName?: string;  // 系列名稱 (Master_Name 欄)
  category: CategoryType;
  subCategory?: string; // New field for sub-category
  color: string;
  size: string;
  gender?: string;      // 性別 (JR/メンズ/レディース/ユニ)
  weightClass?: string; // 重量等級 (3U/4U/5U)
  gripSize?: string;    // 握把尺寸 (G5/G6)
  price: number;
  stock: number;
  imageUrl: string;
}

export const GENDERS = ['JR', 'メンズ', 'レディース', 'ユニ'] as const;

export enum CategoryType {
  Racket = 'ラケット',
  Shoes = 'シューズ',
  Apparel = 'アパレル',
  Bag = 'バッグ',
  Grip = 'グリップ',
  String = 'ストリング',
  Shuttle = 'シャトル',
  Others = 'その他',
}

export type TabId = 'single' | 'model' | 'category' | 'filter' | 'upload' | 'manage';

export const CATEGORIES = [
  CategoryType.Racket,
  CategoryType.Shoes,
  CategoryType.Apparel,
  CategoryType.Bag,
  CategoryType.Grip,
  CategoryType.String,
  CategoryType.Shuttle,
  CategoryType.Others,
];

// Define subcategories based on the provided PDF content
export const CATEGORY_HIERARCHY: Record<CategoryType, string[]> = {
  [CategoryType.Racket]: [
    'オーラスピード',
    'スラスター',
    'ドライブX',
    'トレーニングラケット',
    'ブレイブソード'
  ],
  [CategoryType.Shoes]: [
    'ジュニア',
    '成人'
  ],
  [CategoryType.Apparel]: [
    'Tシャツ',
    'ウィンドブレーカー',
    'ウォームアップジャケット',
    'ウォームアップシャツ',
    'ウォームアップパンツ',
    'ゲームシャツ',
    'ショートソックス',
    'ソックス',
    'ダウンジャケット',
    'トレーナー',
    'パーカー',
    'ハーフパンツ',
    'プルオーバーパーカー',
    'ポロシャツ',
    'ロングTシャツ',
    'ロングソックス',
    '七分丈パンツ'
  ],
  [CategoryType.Bag]: [
    'シャトルバッグ',
    'シューズケース',
    'ショルダーバッグ',
    'ストレージバッグ',
    'ソフトケース',
    'バックパック',
    'ラケットバッグ',
    'ランドリーバッグ',
    '衣類バッグ'
  ],
  [CategoryType.Shuttle]: [
    'NCS',
    'マスターエース',
    'マスターセレクト',
    'マスターワン'
  ],
  [CategoryType.Grip]: [
    'グリップ',
    'グリップパウダー'
  ],
  [CategoryType.String]: [
    'ストリング'
  ],
  [CategoryType.Others]: [
    // From PDF 6. Others
    'ストリングスツールバッグ',
    'ストリングマシーン',
    'バドミントンネット',
    'ポータブルバドミントンポストセット',
    '抗菌マスク',
    // From PDF 5. Komono (Accessories) - Excluding Grip/String which have their own CategoryType
    '２連続グロメット',
    'キャップ',
    'サポーター',
    'ステンシルマーク',
    'ソフトラケットカバー',
    'タオル',
    'バッジ',
    'ヘッドバンド',
    'リストバンド',
    '単体グロメット',
    'インソール'
  ]
};