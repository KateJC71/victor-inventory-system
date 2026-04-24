import React, { useState, useMemo, useEffect, useRef } from 'react';
import * as XLSX from 'xlsx';
import { Product, CategoryType, CATEGORIES, CATEGORY_HIERARCHY, GENDERS } from '../types';
import { PackagePlus, FolderTree, Save, ChevronDown, ChevronRight, Edit2, Check, X, Lock, Plus, Trash2, Loader2, Sparkles, Upload, Image as ImageIcon, FileSpreadsheet, Download, AlertTriangle, CheckCircle } from 'lucide-react';
import { writeFullProduct, uploadImageToCloudinary, writeProductsBatch, BulkProductPayload } from '../services/googleSheets';

// --- Sub Component: Image Upload Field ---
const ImageUploadField: React.FC<{ value: string; onChange: (url: string) => void }> = ({ value, onChange }) => {
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFile = async (file: File) => {
    if (!file.type.startsWith('image/')) {
      setUploadError('画像ファイルを選択してください');
      return;
    }
    setUploadError(null);
    setUploading(true);
    try {
      const url = await uploadImageToCloudinary(file);
      onChange(url);
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : 'アップロード失敗');
    } finally {
      setUploading(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  };

  return (
    <div>
      <label className="block text-xs font-bold text-stone-500 mb-1">商品画像 (任意)</label>

      {value ? (
        <div className="relative">
          <img src={value} alt="preview" className="w-full max-w-xs rounded border border-stone-200" />
          <button
            type="button"
            onClick={() => onChange('')}
            className="absolute top-2 right-2 bg-white/90 hover:bg-red-500 hover:text-white text-red-600 p-1.5 rounded-full shadow border border-red-200"
            title="画像を削除"
          >
            <X size={16} />
          </button>
        </div>
      ) : (
        <div
          onDragOver={e => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`cursor-pointer border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
            dragOver ? 'border-stone-200 bg-stone-50' : 'border-stone-300 hover:border-stone-200 hover:bg-stone-50'
          }`}
        >
          {uploading ? (
            <div className="flex flex-col items-center gap-2 text-stone-900">
              <Loader2 size={24} className="animate-spin" />
              <span className="text-sm">アップロード中...</span>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-2 text-stone-500">
              <Upload size={24} />
              <span className="text-sm font-medium">画像をドラッグ または クリックして選択</span>
              <span className="text-xs text-stone-400">JPG / PNG / GIF / WebP</span>
            </div>
          )}
          <input
            type="file"
            ref={fileInputRef}
            onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
            accept="image/*"
            className="hidden"
          />
        </div>
      )}

      {uploadError && (
        <p className="mt-2 text-xs text-red-600">❌ {uploadError}</p>
      )}

      <p className="mt-2 text-xs text-stone-400">
        または URL を直接入力：
      </p>
      <input
        type="text"
        value={value}
        onChange={e => onChange(e.target.value)}
        className="mt-1 w-full p-2 border border-stone-200 rounded text-xs text-stone-600"
        placeholder="https://..."
      />
    </div>
  );
};

// 管理畫面密碼
const ADMIN_PASSWORD = 'Victor2025';

interface ManageViewProps {
  products: Product[];
  onAddProduct: (product: Product) => void;
  onUpdateSubCategory: (category: CategoryType, oldName: string, newName: string) => void;
  onDeleteSubCategory: (category: CategoryType, subCategoryName: string) => void;
}

export const ManageView: React.FC<ManageViewProps> = ({ products, onAddProduct, onUpdateSubCategory, onDeleteSubCategory }) => {
  const [activeSubTab, setActiveSubTab] = useState<'add' | 'bulk' | 'structure'>('add');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (password === ADMIN_PASSWORD) {
      setIsAuthenticated(true);
      setError('');
    } else {
      setError('パスワードが正しくありません');
    }
  };

  // 密碼輸入畫面
  if (!isAuthenticated) {
    return (
      <div className="p-4 max-w-md mx-auto flex items-center justify-center">
        <div className="bg-white p-8 rounded-xl shadow-sm border border-stone-200 w-full">
          <div className="text-center mb-6">
            <div className="bg-stone-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
              <Lock className="text-stone-900" size={32} />
            </div>
            <h2 className="text-xl font-bold text-stone-900">管理者認証</h2>
            <p className="text-stone-500 text-sm mt-1">パスワードを入力してください</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full p-3 border border-stone-300 rounded-lg focus:ring-2 focus:ring-stone-900 outline-none text-center text-lg tracking-widest"
                placeholder="••••••••"
                autoFocus
              />
            </div>
            {error && (
              <p className="text-red-500 text-sm text-center">{error}</p>
            )}
            <button
              type="submit"
              className="w-full bg-stone-900 hover:bg-stone-900 text-white font-bold py-3 rounded-lg transition-colors"
            >
              ログイン
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 max-w-7xl mx-auto">
      <div className="flex justify-center mb-6 overflow-x-auto">
        <div className="bg-stone-100 p-1 rounded-lg flex text-sm font-medium">
          <button
            onClick={() => setActiveSubTab('add')}
            className={`px-4 py-2 rounded-md transition-all flex items-center gap-2 whitespace-nowrap ${
              activeSubTab === 'add' ? 'bg-white text-stone-900 shadow-sm' : 'text-stone-500 hover:text-stone-700'
            }`}
          >
            <PackagePlus size={16} />
            商品登録
          </button>
          <button
            onClick={() => setActiveSubTab('bulk')}
            className={`px-4 py-2 rounded-md transition-all flex items-center gap-2 whitespace-nowrap ${
              activeSubTab === 'bulk' ? 'bg-white text-stone-900 shadow-sm' : 'text-stone-500 hover:text-stone-700'
            }`}
          >
            <FileSpreadsheet size={16} />
            一括登録
          </button>
          <button
            onClick={() => setActiveSubTab('structure')}
            className={`px-4 py-2 rounded-md transition-all flex items-center gap-2 whitespace-nowrap ${
              activeSubTab === 'structure' ? 'bg-white text-stone-900 shadow-sm' : 'text-stone-500 hover:text-stone-700'
            }`}
          >
            <FolderTree size={16} />
            カテゴリ構造
          </button>
        </div>
      </div>

      {activeSubTab === 'add' && <AddProductForm products={products} onAdd={onAddProduct} />}
      {activeSubTab === 'bulk' && <BulkImportForm products={products} onAdd={onAddProduct} />}
      {activeSubTab === 'structure' && <CategoryStructureEditor products={products} onUpdate={onUpdateSubCategory} onDelete={onDeleteSubCategory} />}
    </div>
  );
};

// --- Sub Component: Add Product Form ---

const AddProductForm: React.FC<{ products: Product[], onAdd: (p: Product) => void }> = ({ products, onAdd }) => {
  const [formData, setFormData] = useState<Partial<Product>>({
    category: CategoryType.Racket,
    subCategory: '',
    stock: 0,
    price: 0,
  });
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [autofillHint, setAutofillHint] = useState<string | null>(null);

  // 既存型號清單（用於自動辨識）
  const modelIndex = useMemo(() => {
    const map = new Map<string, Product>();
    products.forEach(p => {
      const key = (p.modelName || '').trim().toUpperCase();
      if (key && !map.has(key)) map.set(key, p);
    });
    return map;
  }, [products]);

  // 當 modelName 改變時，嘗試自動帶入其他欄位
  useEffect(() => {
    const model = (formData.modelName || '').trim().toUpperCase();
    if (!model) {
      setAutofillHint(null);
      return;
    }
    const match = modelIndex.get(model);
    if (match) {
      setAutofillHint(`既存の型番「${match.modelName}」を検出 → 分類・性別・価格を自動入力`);
      setFormData(prev => ({
        ...prev,
        category: match.category,
        subCategory: prev.subCategory || match.subCategory || '',
        gender: prev.gender || match.gender || '',
        price: prev.price && Number(prev.price) > 0 ? prev.price : match.price,
      }));
    } else {
      setAutofillHint(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formData.modelName, modelIndex]);

  const existingSubCategories = useMemo(() => {
    if (!formData.category) return [];
    const subs = new Set<string>();

    // 1. Add from static hierarchy definition (from PDF)
    const staticSubs = CATEGORY_HIERARCHY[formData.category as CategoryType] || [];
    staticSubs.forEach(s => subs.add(s));

    // 2. Add from existing products (in case there are custom ones not in the static list)
    products
      .filter(p => p.category === formData.category)
      .forEach(p => {
        if (p.subCategory) subs.add(p.subCategory);
      });

    return Array.from(subs).sort();
  }, [products, formData.category]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);

    if (!formData.sku || !formData.modelName || !formData.category) {
      setSubmitError('必須項目を入力してください（SKU / Model / 分類）');
      return;
    }

    // 重複 SKU 檢查（前端先擋一道）
    const skuClean = String(formData.sku).trim();
    const skuUpper = skuClean.toUpperCase();
    if (products.some(p => p.sku.trim().toUpperCase() === skuUpper)) {
      setSubmitError(`SKU「${skuClean}」は既に存在します`);
      return;
    }

    // Master Name 與商品名自動使用 SKU
    const newProduct: Product = {
      sku: skuClean,
      name: skuClean,
      modelName: formData.modelName,
      masterName: skuClean,
      category: formData.category as CategoryType,
      subCategory: formData.subCategory || '',
      color: formData.color || '',
      size: formData.size || '',
      gender: formData.gender || '',
      price: Number(formData.price) || 0,
      stock: Number(formData.stock) || 0,
      imageUrl: formData.imageUrl || '',
    };

    setSubmitting(true);
    try {
      await writeFullProduct({
        sku: newProduct.sku,
        modelName: newProduct.modelName,
        name: newProduct.name,
        category: newProduct.category,
        masterName: newProduct.masterName,
        subCategory: newProduct.subCategory,
        color: newProduct.color,
        colorCode: newProduct.color,
        size: newProduct.size,
        gender: newProduct.gender,
        price: newProduct.price,
        stock: newProduct.stock,
        imageUrl: newProduct.imageUrl,
      });

      // Sheet 寫入成功 → 更新本地 state
      onAdd(newProduct);
      alert('商品を登録しました ✅');
      // Reset critical fields but keep context（gender/category 保留方便連續新增）
      setFormData(prev => ({ ...prev, sku: '', color: '', size: '', stock: 0, imageUrl: '' }));
      setAutofillHint(null);
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : '登録に失敗しました');
    } finally {
      setSubmitting(false);
    }
  };

  const handleChange = (field: keyof Product, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <form onSubmit={handleSubmit} className="bg-white p-6 rounded-xl shadow-sm border border-stone-200 space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-bold text-stone-500 mb-1">SKU (必須)</label>
          <input
            type="text"
            value={formData.sku || ''}
            onChange={e => handleChange('sku', e.target.value)}
            className="w-full p-2 border border-stone-300 rounded focus:ring-2 focus:ring-stone-900 outline-none"
            placeholder="A170JR-Example"
            required
          />
        </div>
        <div>
           <label className="block text-xs font-bold text-stone-500 mb-1">Model Name (必須)</label>
           <input
            type="text"
            value={formData.modelName || ''}
            onChange={e => handleChange('modelName', e.target.value)}
            className="w-full p-2 border border-stone-300 rounded focus:ring-2 focus:ring-stone-900 outline-none"
            placeholder="A170JR"
            required
          />
          {autofillHint && (
            <p className="mt-1 text-xs text-stone-900 flex items-center gap-1">
              <Sparkles size={12} />
              {autofillHint}
            </p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-bold text-stone-500 mb-1">大分類</label>
          <select
            value={formData.category}
            onChange={e => handleChange('category', e.target.value)}
            className="w-full p-2 border border-stone-300 rounded focus:ring-2 focus:ring-stone-900 outline-none bg-white"
          >
            {CATEGORIES.map(c => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-bold text-stone-500 mb-1">小分類</label>
          <select
            value={formData.subCategory || ''}
            onChange={e => {
              if (e.target.value === '__custom__') {
                const input = prompt('新しい小分類名を入力');
                if (input && input.trim()) handleChange('subCategory', input.trim());
              } else {
                handleChange('subCategory', e.target.value);
              }
            }}
            className="w-full p-2 border border-stone-300 rounded focus:ring-2 focus:ring-stone-900 outline-none bg-white"
          >
            <option value="">選択してください</option>
            {existingSubCategories.map(sub => (
              <option key={sub} value={sub}>{sub}</option>
            ))}
            {formData.subCategory && !existingSubCategories.includes(formData.subCategory) && (
              <option value={formData.subCategory}>{formData.subCategory}（新規）</option>
            )}
            <option value="__custom__">＋ その他（新規入力）</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-bold text-stone-500 mb-1">性別 (任意)</label>
          <select
            value={formData.gender || ''}
            onChange={e => handleChange('gender', e.target.value)}
            className="w-full p-2 border border-stone-300 rounded focus:ring-2 focus:ring-stone-900 outline-none bg-white"
          >
            <option value="">指定なし</option>
            {GENDERS.map(g => (
              <option key={g} value={g}>{g}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-bold text-stone-500 mb-1">カラー</label>
          <input
            type="text"
            value={formData.color || ''}
            onChange={e => handleChange('color', e.target.value)}
            className="w-full p-2 border border-stone-300 rounded outline-none"
            placeholder="A / I / M / R 等"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-bold text-stone-500 mb-1">サイズ</label>
          <input
            type="text"
            value={formData.size || ''}
            onChange={e => handleChange('size', e.target.value)}
            className="w-full p-2 border border-stone-300 rounded outline-none"
          />
        </div>
        <div>
          <label className="block text-xs font-bold text-stone-500 mb-1">価格 (税込)</label>
          <input
            type="number"
            value={formData.price || 0}
            onChange={e => handleChange('price', e.target.value)}
            className="w-full p-2 border border-stone-300 rounded outline-none"
          />
        </div>
      </div>

      <div>
        <label className="block text-xs font-bold text-stone-500 mb-1">在庫数</label>
        <input
          type="number"
          value={formData.stock || 0}
          onChange={e => handleChange('stock', e.target.value)}
          className="w-full p-2 border border-stone-300 rounded outline-none"
        />
      </div>

      <ImageUploadField
        value={formData.imageUrl || ''}
        onChange={url => handleChange('imageUrl', url)}
      />

      {submitError && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm p-3 rounded">
          ❌ {submitError}
        </div>
      )}

      <button
        type="submit"
        disabled={submitting}
        className="w-full mt-4 bg-stone-900 hover:bg-stone-900 disabled:bg-stone-400 disabled:cursor-not-allowed text-white font-bold py-3 rounded-lg flex items-center justify-center gap-2 transition-colors"
      >
        {submitting ? (
          <>
            <Loader2 size={18} className="animate-spin" />
            保存中...
          </>
        ) : (
          <>
            <Save size={18} />
            商品を保存（Google Sheet に書き込み）
          </>
        )}
      </button>
    </form>
  );
};

// --- Sub Component: Bulk Import Form (Excel 一括登録) ---

type BulkRow = BulkProductPayload & { _rowIndex: number };
type BulkStage = 'idle' | 'preview' | 'submitting' | 'done';

// Excel テンプレートのヘッダー行（日本語）とフィールドの対応
const BULK_HEADERS: Array<{ key: keyof BulkProductPayload; label: string; example: string }> = [
  { key: 'sku',          label: 'SKU（必須）',       example: 'ARS-3100A4UG5' },
  { key: 'modelName',    label: 'Model Name（必須）', example: 'ARS-3100' },
  { key: 'category',     label: '大分類（必須）',     example: 'ラケット' },
  { key: 'subCategory',  label: '小分類',             example: 'オーラスピード' },
  { key: 'gender',       label: '性別',               example: 'ユニ' },
  { key: 'colorCode',    label: 'カラーコード',       example: 'A' },
  { key: 'color',        label: 'カラー',             example: 'A' },
  { key: 'size',         label: 'サイズ',             example: '4U' },
  { key: 'weightClass',  label: '重量',               example: '4U' },
  { key: 'gripSize',     label: 'グリップ',           example: 'G5' },
  { key: 'price',        label: '価格',               example: '30000' },
  { key: 'stock',        label: '在庫',               example: '0' },
  { key: 'imageUrl',     label: '画像URL',            example: '' },
];

const BulkImportForm: React.FC<{ products: Product[], onAdd: (p: Product) => void }> = ({ products, onAdd }) => {
  const [stage, setStage] = useState<BulkStage>('idle');
  const [rows, setRows] = useState<BulkRow[]>([]);
  const [parseError, setParseError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [result, setResult] = useState<{ added: number; skipped: number; skippedSkus: string[] } | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const existingSkuSet = useMemo(() => {
    const s = new Set<string>();
    products.forEach(p => s.add(p.sku.trim().toUpperCase()));
    return s;
  }, [products]);

  // 檔案內重複 SKU
  const duplicateInFile = useMemo(() => {
    const seen = new Set<string>();
    const dup = new Set<string>();
    rows.forEach(r => {
      const key = (r.sku || '').trim().toUpperCase();
      if (!key) return;
      if (seen.has(key)) dup.add(key);
      else seen.add(key);
    });
    return dup;
  }, [rows]);

  const newCount = useMemo(
    () => rows.filter(r => r.sku && !existingSkuSet.has(r.sku.trim().toUpperCase())).length,
    [rows, existingSkuSet]
  );
  const existingCount = rows.length - newCount;

  const handleDownloadTemplate = () => {
    const aoa: any[][] = [
      BULK_HEADERS.map(h => h.label),
      BULK_HEADERS.map(h => h.example),  // 範例列
    ];
    const ws = XLSX.utils.aoa_to_sheet(aoa);
    // 列寬調整
    ws['!cols'] = BULK_HEADERS.map(h => ({ wch: Math.max(h.label.length, 12) + 2 }));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, '商品一括登録');
    XLSX.writeFile(wb, 'Victor_商品一括登録_テンプレート.xlsx');
  };

  const parseFile = async (file: File) => {
    setParseError(null);
    setResult(null);
    setStage('idle');
    setRows([]);

    try {
      const buffer = await file.arrayBuffer();
      const wb = XLSX.read(buffer, { type: 'array' });
      const sheetName = wb.SheetNames[0];
      const ws = wb.Sheets[sheetName];
      const data: any[][] = XLSX.utils.sheet_to_json(ws, { header: 1, blankrows: false, defval: '' });

      if (data.length < 2) {
        setParseError('データ行がありません（ヘッダーのみ）');
        return;
      }

      const header = data[0].map((h: any) => String(h).trim());

      // 比對欄位 → index
      const colIdx: Record<string, number> = {};
      BULK_HEADERS.forEach(h => {
        const idx = header.findIndex(c => c === h.label || c.replace(/（.+?）/g, '') === h.label.replace(/（.+?）/g, ''));
        colIdx[h.key] = idx;
      });

      if (colIdx['sku'] < 0) {
        setParseError('ヘッダー「SKU（必須）」が見つかりません。テンプレートをダウンロードして使ってください。');
        return;
      }

      const parsed: BulkRow[] = [];
      for (let i = 1; i < data.length; i++) {
        const row = data[i];
        const sku = String(row[colIdx['sku']] || '').trim();
        if (!sku) continue;  // 空行スキップ

        const r: BulkRow = {
          _rowIndex: i + 1,
          sku,
          modelName: String(row[colIdx['modelName']] || '').trim(),
          category: String(row[colIdx['category']] || '').trim(),
          subCategory: String(row[colIdx['subCategory']] || '').trim(),
          gender: String(row[colIdx['gender']] || '').trim(),
          colorCode: String(row[colIdx['colorCode']] || '').trim(),
          color: String(row[colIdx['color']] || '').trim(),
          size: String(row[colIdx['size']] || '').trim(),
          weightClass: String(row[colIdx['weightClass']] || '').trim(),
          gripSize: String(row[colIdx['gripSize']] || '').trim(),
          price: Number(row[colIdx['price']]) || 0,
          stock: Number(row[colIdx['stock']]) || 0,
          imageUrl: String(row[colIdx['imageUrl']] || '').trim(),
        };
        parsed.push(r);
      }

      if (parsed.length === 0) {
        setParseError('有効なデータがありません');
        return;
      }

      setRows(parsed);
      setStage('preview');
    } catch (err) {
      setParseError(err instanceof Error ? err.message : 'ファイル解析に失敗');
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) parseFile(file);
  };

  const handleSubmit = async () => {
    if (rows.length === 0) return;
    setSubmitError(null);
    setStage('submitting');
    try {
      const payload: BulkProductPayload[] = rows.map(({ _rowIndex, ...rest }) => rest);
      const res = await writeProductsBatch(payload);
      setResult({ added: res.added, skipped: res.skipped, skippedSkus: res.skippedSkus });

      // 本地 state 追加（避免要等下次 refresh）
      rows.forEach(r => {
        const skuUpper = (r.sku || '').trim().toUpperCase();
        if (existingSkuSet.has(skuUpper)) return;
        onAdd({
          sku: r.sku,
          name: r.sku,
          modelName: r.modelName || '',
          masterName: r.sku,
          category: (r.category as CategoryType) || CategoryType.Others,
          subCategory: r.subCategory || '',
          color: r.color || '',
          size: r.size || '',
          gender: r.gender || '',
          price: Number(r.price) || 0,
          stock: Number(r.stock) || 0,
          imageUrl: r.imageUrl || '',
        });
      });

      setStage('done');
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : '登録に失敗');
      setStage('preview');
    }
  };

  const handleReset = () => {
    setStage('idle');
    setRows([]);
    setParseError(null);
    setSubmitError(null);
    setResult(null);
  };

  // ===== 結果畫面 =====
  if (stage === 'done' && result) {
    return (
      <div className="bg-white p-6 rounded-xl shadow-sm border border-stone-200">
        <div className="flex flex-col items-center text-center py-8">
          <div className="bg-emerald-100 w-16 h-16 rounded-full flex items-center justify-center mb-4">
            <CheckCircle className="text-emerald-700" size={32} />
          </div>
          <h3 className="text-xl font-bold text-stone-900 mb-2">一括登録が完了しました</h3>
          <p className="text-stone-600 mb-4">
            <span className="text-2xl font-bold text-emerald-700">{result.added}</span> 件追加 / {result.skipped > 0 ? <span><span className="text-yellow-600 font-bold">{result.skipped}</span> 件スキップ</span> : null}
          </p>
          {result.skippedSkus && result.skippedSkus.length > 0 && (
            <div className="mt-2 p-3 bg-yellow-50 rounded text-left w-full max-w-md">
              <p className="text-xs font-bold text-yellow-800 mb-1">⚠️ 既存のためスキップした SKU：</p>
              <p className="text-xs text-yellow-700 break-all">{result.skippedSkus.join(', ')}{result.skippedSkus.length >= 20 ? ' ...' : ''}</p>
            </div>
          )}
          <button
            onClick={handleReset}
            className="mt-6 bg-stone-900 hover:bg-stone-900 text-white font-bold py-2 px-6 rounded-lg"
          >
            続けて別のファイルを登録
          </button>
        </div>
      </div>
    );
  }

  // ===== 預覽畫面 =====
  if (stage === 'preview' || stage === 'submitting') {
    return (
      <div className="bg-white p-6 rounded-xl shadow-sm border border-stone-200 space-y-4">
        <h3 className="text-lg font-bold text-stone-900">登録内容の確認</h3>

        <div className="grid grid-cols-3 gap-3 text-center">
          <div className="bg-stone-50 rounded-lg p-3">
            <div className="text-2xl font-bold text-stone-900">{rows.length}</div>
            <div className="text-xs text-stone-600">読み込み</div>
          </div>
          <div className="bg-emerald-100 rounded-lg p-3">
            <div className="text-2xl font-bold text-emerald-700">{newCount}</div>
            <div className="text-xs text-stone-600">新規追加</div>
          </div>
          <div className="bg-yellow-50 rounded-lg p-3">
            <div className="text-2xl font-bold text-yellow-600">{existingCount}</div>
            <div className="text-xs text-stone-600">既存スキップ</div>
          </div>
        </div>

        {duplicateInFile.size > 0 && (
          <div className="bg-orange-50 border border-orange-200 rounded-lg p-3 text-sm text-orange-800 flex gap-2">
            <AlertTriangle size={16} className="flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-bold">ファイル内に重複 SKU があります（{duplicateInFile.size} 件）</p>
              <p className="text-xs">重複分は 1 件のみ追加されます。</p>
            </div>
          </div>
        )}

        <div className="overflow-x-auto border border-stone-200 rounded-lg">
          <table className="min-w-full text-xs">
            <thead className="bg-stone-50 border-b border-stone-200">
              <tr>
                <th className="p-2 text-left">行</th>
                <th className="p-2 text-left">SKU</th>
                <th className="p-2 text-left">Model</th>
                <th className="p-2 text-left">大分類</th>
                <th className="p-2 text-left">小分類</th>
                <th className="p-2 text-left">色</th>
                <th className="p-2 text-left">サイズ</th>
                <th className="p-2 text-right">価格</th>
                <th className="p-2 text-right">在庫</th>
                <th className="p-2 text-left">状態</th>
              </tr>
            </thead>
            <tbody>
              {rows.slice(0, 100).map((r, idx) => {
                const skuUpper = (r.sku || '').trim().toUpperCase();
                const isExisting = existingSkuSet.has(skuUpper);
                const isDupInFile = duplicateInFile.has(skuUpper);
                return (
                  <tr key={idx} className={`border-b border-stone-100 ${isExisting ? 'bg-yellow-50' : ''}`}>
                    <td className="p-2 text-stone-400">{r._rowIndex}</td>
                    <td className="p-2 font-mono">{r.sku}</td>
                    <td className="p-2">{r.modelName}</td>
                    <td className="p-2">{r.category}</td>
                    <td className="p-2">{r.subCategory}</td>
                    <td className="p-2">{r.color}</td>
                    <td className="p-2">{r.size}</td>
                    <td className="p-2 text-right">{r.price ? `¥${Number(r.price).toLocaleString()}` : ''}</td>
                    <td className="p-2 text-right">{r.stock || 0}</td>
                    <td className="p-2">
                      {isExisting
                        ? <span className="text-yellow-600">既存</span>
                        : isDupInFile
                        ? <span className="text-orange-600">重複</span>
                        : <span className="text-emerald-700">新規</span>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {rows.length > 100 && (
            <div className="p-3 text-center text-xs text-stone-500 bg-stone-50">
              ...他 {rows.length - 100} 行（全て登録されます）
            </div>
          )}
        </div>

        {submitError && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-600">
            {submitError}
          </div>
        )}

        <div className="flex gap-3 justify-end pt-2">
          <button
            type="button"
            onClick={handleReset}
            disabled={stage === 'submitting'}
            className="px-4 py-2 text-stone-700 bg-stone-100 hover:bg-stone-200 rounded-lg disabled:opacity-50"
          >
            キャンセル
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={stage === 'submitting' || newCount === 0}
            className="px-6 py-2 bg-stone-900 hover:bg-stone-900 text-white font-bold rounded-lg flex items-center gap-2 disabled:opacity-50"
          >
            {stage === 'submitting' ? (
              <><Loader2 size={16} className="animate-spin" /> 登録中...</>
            ) : (
              <><Save size={16} /> {newCount} 件を登録</>
            )}
          </button>
        </div>
      </div>
    );
  }

  // ===== 初始畫面 =====
  return (
    <div className="bg-white p-6 rounded-xl shadow-sm border border-stone-200 space-y-4">
      <div className="bg-stone-50 rounded-lg p-4 text-sm text-stone-900">
        <p className="font-bold mb-1">📝 使い方</p>
        <ol className="list-decimal ml-5 space-y-1 text-xs">
          <li>「テンプレートをダウンロード」で Excel ファイルを取得</li>
          <li>商品情報を入力（1 行 1 商品、SKU / Model Name / 大分類 は必須）</li>
          <li>ファイルをドラッグまたはクリックしてアップロード</li>
          <li>プレビューで確認 →「登録」をクリック</li>
        </ol>
        <p className="mt-2 text-xs text-stone-900">
          ℹ️ 既存の SKU は自動的にスキップされます（上書きしません）
        </p>
      </div>

      <button
        type="button"
        onClick={handleDownloadTemplate}
        className="w-full flex items-center justify-center gap-2 py-3 border-2 border-stone-200 hover:border-stone-200 hover:bg-stone-50 rounded-lg text-stone-900 font-medium transition-colors"
      >
        <Download size={18} />
        テンプレートをダウンロード (.xlsx)
      </button>

      <div
        onDragOver={e => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`cursor-pointer border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
          dragOver ? 'border-stone-200 bg-stone-50' : 'border-stone-300 hover:border-stone-200 hover:bg-stone-50'
        }`}
      >
        <div className="flex flex-col items-center gap-2 text-stone-500">
          <Upload size={32} />
          <span className="text-sm font-medium">Excel ファイルをドラッグ または クリックして選択</span>
          <span className="text-xs text-stone-400">.xlsx / .xls / .csv</span>
        </div>
        <input
          type="file"
          ref={fileInputRef}
          onChange={e => { const f = e.target.files?.[0]; if (f) parseFile(f); }}
          accept=".xlsx,.xls,.csv"
          className="hidden"
        />
      </div>

      {parseError && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-600 flex gap-2">
          <AlertTriangle size={16} className="flex-shrink-0 mt-0.5" />
          {parseError}
        </div>
      )}
    </div>
  );
};

// --- Sub Component: Category Structure Editor ---

const CategoryStructureEditor: React.FC<{
  products: Product[],
  onUpdate: (c: CategoryType, o: string, n: string) => void,
  onDelete: (c: CategoryType, subName: string) => void
}> = ({ products, onUpdate, onDelete }) => {
  const [openCategory, setOpenCategory] = useState<CategoryType | null>(null);
  const [editingSub, setEditingSub] = useState<{ cat: CategoryType, oldName: string } | null>(null);
  const [newName, setNewName] = useState('');
  const [addingTo, setAddingTo] = useState<CategoryType | null>(null);
  const [newSubName, setNewSubName] = useState('');

  // Combine static hierarchy with used hierarchy
  const structure = useMemo(() => {
    const map: Partial<Record<CategoryType, Set<string>>> = {};
    CATEGORIES.forEach(c => map[c] = new Set());
    
    // Add static hierarchy first
    Object.entries(CATEGORY_HIERARCHY).forEach(([cat, subs]) => {
      subs.forEach(s => map[cat as CategoryType]?.add(s));
    });

    // Add existing from products
    products.forEach(p => {
      if (p.subCategory && map[p.category]) {
        map[p.category]?.add(p.subCategory);
      }
    });
    return map;
  }, [products]);

  const handleEditClick = (cat: CategoryType, oldName: string) => {
    setEditingSub({ cat, oldName });
    setNewName(oldName);
  };

  const handleSave = () => {
    if (editingSub && newName.trim()) {
      onUpdate(editingSub.cat, editingSub.oldName, newName.trim());
      setEditingSub(null);
      setNewName('');
    }
  };

  const handleAddSubCategory = (category: CategoryType) => {
    if (newSubName.trim()) {
      // 新增小分類：用一個空的更新來觸發（從空字串更新到新名稱）
      onUpdate(category, '', newSubName.trim());
      setAddingTo(null);
      setNewSubName('');
    }
  };

  const handleDelete = (category: CategoryType, subName: string) => {
    const itemCount = products.filter(p => p.category === category && p.subCategory === subName).length;
    if (itemCount > 0) {
      if (!confirm(`この小分類には ${itemCount} 件の商品があります。削除すると商品の小分類が空になります。続行しますか？`)) {
        return;
      }
    }
    onDelete(category, subName);
  };

  return (
    <div className="space-y-3">
      <div className="bg-stone-50 p-4 rounded-lg border border-stone-200 text-sm text-stone-900 mb-4">
        <p>ここで小分類の名前を変更すると、関連するすべての商品の小分類が一括で更新されます。</p>
      </div>

      {CATEGORIES.map(category => {
        const categorySet = structure[category];
        const subCats = categorySet ? Array.from(categorySet).sort() : [];
        const isOpen = openCategory === category;

        return (
          <div key={category} className="bg-white border border-stone-200 rounded-lg overflow-hidden">
            <button
              onClick={() => setOpenCategory(isOpen ? null : category)}
              className="w-full flex items-center justify-between p-4 bg-stone-50 hover:bg-stone-100 transition-colors"
            >
              <div className="flex items-center gap-2">
                <span className="font-bold text-stone-800">{category}</span>
                <span className="text-xs bg-white border px-2 py-0.5 rounded-full text-stone-500">
                  {subCats.length} 小分類
                </span>
              </div>
              {isOpen ? <ChevronDown size={18} className="text-stone-400" /> : <ChevronRight size={18} className="text-stone-400" />}
            </button>

            {isOpen && (
              <div className="p-2 space-y-1">
                {subCats.length === 0 && !addingTo && (
                   <p className="text-center py-4 text-stone-400 text-xs italic">小分類はまだありません</p>
                )}
                {subCats.map(sub => (
                  <div key={sub} className="flex items-center justify-between p-3 bg-white border border-stone-100 rounded hover:border-stone-200 group">
                    {editingSub?.cat === category && editingSub?.oldName === sub ? (
                      <div className="flex items-center gap-2 w-full">
                         <input
                           type="text"
                           value={newName}
                           onChange={(e) => setNewName(e.target.value)}
                           className="flex-1 p-1 border border-stone-200 rounded text-sm outline-none"
                           autoFocus
                         />
                         <button onClick={handleSave} className="p-1 text-emerald-700 hover:bg-emerald-100 rounded"><Check size={16}/></button>
                         <button onClick={() => setEditingSub(null)} className="p-1 text-red-500 hover:bg-red-50 rounded"><X size={16}/></button>
                      </div>
                    ) : (
                      <>
                        <span className="text-sm text-stone-700 ml-2">{sub}</span>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-stone-400 mr-2">
                            {products.filter(p => p.category === category && p.subCategory === sub).length} items
                          </span>
                          <button
                            onClick={() => handleEditClick(category, sub)}
                            className="p-1.5 text-stone-400 hover:text-stone-900 hover:bg-stone-50 rounded transition-colors"
                          >
                            <Edit2 size={14} />
                          </button>
                          <button
                            onClick={() => handleDelete(category, sub)}
                            className="p-1.5 text-stone-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                ))}

                {/* 新增小分類 */}
                {addingTo === category ? (
                  <div className="flex items-center gap-2 p-3 bg-stone-50 border border-stone-200 rounded">
                    <input
                      type="text"
                      value={newSubName}
                      onChange={(e) => setNewSubName(e.target.value)}
                      className="flex-1 p-1 border border-stone-200 rounded text-sm outline-none"
                      placeholder="新しい小分類名..."
                      autoFocus
                    />
                    <button
                      onClick={() => handleAddSubCategory(category)}
                      className="p-1 text-emerald-700 hover:bg-emerald-100 rounded"
                    >
                      <Check size={16}/>
                    </button>
                    <button
                      onClick={() => { setAddingTo(null); setNewSubName(''); }}
                      className="p-1 text-red-500 hover:bg-red-50 rounded"
                    >
                      <X size={16}/>
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setAddingTo(category)}
                    className="w-full flex items-center justify-center gap-2 p-3 text-stone-900 hover:bg-stone-50 border border-dashed border-stone-200 rounded transition-colors text-sm"
                  >
                    <Plus size={16} />
                    小分類を追加
                  </button>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};