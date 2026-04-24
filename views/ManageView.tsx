import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Product, CategoryType, CATEGORIES, CATEGORY_HIERARCHY, GENDERS } from '../types';
import { PackagePlus, FolderTree, Save, ChevronDown, ChevronRight, Edit2, Check, X, Lock, Plus, Trash2, Loader2, Sparkles, Upload, Image as ImageIcon } from 'lucide-react';
import { writeFullProduct, uploadImageToCloudinary } from '../services/googleSheets';

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
      <label className="block text-xs font-bold text-gray-500 mb-1">商品画像 (任意)</label>

      {value ? (
        <div className="relative">
          <img src={value} alt="preview" className="w-full max-w-xs rounded border border-gray-200" />
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
            dragOver ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-blue-400 hover:bg-gray-50'
          }`}
        >
          {uploading ? (
            <div className="flex flex-col items-center gap-2 text-blue-600">
              <Loader2 size={24} className="animate-spin" />
              <span className="text-sm">アップロード中...</span>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-2 text-gray-500">
              <Upload size={24} />
              <span className="text-sm font-medium">画像をドラッグ または クリックして選択</span>
              <span className="text-xs text-gray-400">JPG / PNG / GIF / WebP</span>
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

      <p className="mt-2 text-xs text-gray-400">
        または URL を直接入力：
      </p>
      <input
        type="text"
        value={value}
        onChange={e => onChange(e.target.value)}
        className="mt-1 w-full p-2 border border-gray-200 rounded text-xs text-gray-600"
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
  const [activeSubTab, setActiveSubTab] = useState<'add' | 'structure'>('add');
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
      <div className="p-4 max-w-md mx-auto min-h-[80vh] flex items-center justify-center">
        <div className="bg-white p-8 rounded-xl shadow-sm border border-gray-200 w-full">
          <div className="text-center mb-6">
            <div className="bg-blue-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
              <Lock className="text-blue-600" size={32} />
            </div>
            <h2 className="text-xl font-bold text-gray-900">管理者認証</h2>
            <p className="text-gray-500 text-sm mt-1">パスワードを入力してください</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-center text-lg tracking-widest"
                placeholder="••••••••"
                autoFocus
              />
            </div>
            {error && (
              <p className="text-red-500 text-sm text-center">{error}</p>
            )}
            <button
              type="submit"
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-lg transition-colors"
            >
              ログイン
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 max-w-3xl mx-auto min-h-[80vh]">
      <div className="flex justify-center mb-6">
        <div className="bg-gray-100 p-1 rounded-lg flex text-sm font-medium">
          <button
            onClick={() => setActiveSubTab('add')}
            className={`px-6 py-2 rounded-md transition-all flex items-center gap-2 ${
              activeSubTab === 'add' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <PackagePlus size={16} />
            商品登録
          </button>
          <button
            onClick={() => setActiveSubTab('structure')}
            className={`px-6 py-2 rounded-md transition-all flex items-center gap-2 ${
              activeSubTab === 'structure' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <FolderTree size={16} />
            カテゴリ構造
          </button>
        </div>
      </div>

      {activeSubTab === 'add' ? (
        <AddProductForm products={products} onAdd={onAddProduct} />
      ) : (
        <CategoryStructureEditor products={products} onUpdate={onUpdateSubCategory} onDelete={onDeleteSubCategory} />
      )}
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
    <form onSubmit={handleSubmit} className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-bold text-gray-500 mb-1">SKU (必須)</label>
          <input
            type="text"
            value={formData.sku || ''}
            onChange={e => handleChange('sku', e.target.value)}
            className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 outline-none"
            placeholder="A170JR-Example"
            required
          />
        </div>
        <div>
           <label className="block text-xs font-bold text-gray-500 mb-1">Model Name (必須)</label>
           <input
            type="text"
            value={formData.modelName || ''}
            onChange={e => handleChange('modelName', e.target.value)}
            className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 outline-none"
            placeholder="A170JR"
            required
          />
          {autofillHint && (
            <p className="mt-1 text-xs text-blue-600 flex items-center gap-1">
              <Sparkles size={12} />
              {autofillHint}
            </p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-bold text-gray-500 mb-1">大分類</label>
          <select
            value={formData.category}
            onChange={e => handleChange('category', e.target.value)}
            className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 outline-none bg-white"
          >
            {CATEGORIES.map(c => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-bold text-gray-500 mb-1">小分類</label>
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
            className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 outline-none bg-white"
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
          <label className="block text-xs font-bold text-gray-500 mb-1">性別 (任意)</label>
          <select
            value={formData.gender || ''}
            onChange={e => handleChange('gender', e.target.value)}
            className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 outline-none bg-white"
          >
            <option value="">指定なし</option>
            {GENDERS.map(g => (
              <option key={g} value={g}>{g}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-bold text-gray-500 mb-1">カラー</label>
          <input
            type="text"
            value={formData.color || ''}
            onChange={e => handleChange('color', e.target.value)}
            className="w-full p-2 border border-gray-300 rounded outline-none"
            placeholder="A / I / M / R 等"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-bold text-gray-500 mb-1">サイズ</label>
          <input
            type="text"
            value={formData.size || ''}
            onChange={e => handleChange('size', e.target.value)}
            className="w-full p-2 border border-gray-300 rounded outline-none"
          />
        </div>
        <div>
          <label className="block text-xs font-bold text-gray-500 mb-1">価格 (税込)</label>
          <input
            type="number"
            value={formData.price || 0}
            onChange={e => handleChange('price', e.target.value)}
            className="w-full p-2 border border-gray-300 rounded outline-none"
          />
        </div>
      </div>

      <div>
        <label className="block text-xs font-bold text-gray-500 mb-1">在庫数</label>
        <input
          type="number"
          value={formData.stock || 0}
          onChange={e => handleChange('stock', e.target.value)}
          className="w-full p-2 border border-gray-300 rounded outline-none"
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
        className="w-full mt-4 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white font-bold py-3 rounded-lg flex items-center justify-center gap-2 transition-colors"
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
      <div className="bg-blue-50 p-4 rounded-lg border border-blue-100 text-sm text-blue-800 mb-4">
        <p>ここで小分類の名前を変更すると、関連するすべての商品の小分類が一括で更新されます。</p>
      </div>

      {CATEGORIES.map(category => {
        const categorySet = structure[category];
        const subCats = categorySet ? Array.from(categorySet).sort() : [];
        const isOpen = openCategory === category;

        return (
          <div key={category} className="bg-white border border-gray-200 rounded-lg overflow-hidden">
            <button
              onClick={() => setOpenCategory(isOpen ? null : category)}
              className="w-full flex items-center justify-between p-4 bg-gray-50 hover:bg-gray-100 transition-colors"
            >
              <div className="flex items-center gap-2">
                <span className="font-bold text-gray-800">{category}</span>
                <span className="text-xs bg-white border px-2 py-0.5 rounded-full text-gray-500">
                  {subCats.length} 小分類
                </span>
              </div>
              {isOpen ? <ChevronDown size={18} className="text-gray-400" /> : <ChevronRight size={18} className="text-gray-400" />}
            </button>

            {isOpen && (
              <div className="p-2 space-y-1">
                {subCats.length === 0 && !addingTo && (
                   <p className="text-center py-4 text-gray-400 text-xs italic">小分類はまだありません</p>
                )}
                {subCats.map(sub => (
                  <div key={sub} className="flex items-center justify-between p-3 bg-white border border-gray-100 rounded hover:border-blue-100 group">
                    {editingSub?.cat === category && editingSub?.oldName === sub ? (
                      <div className="flex items-center gap-2 w-full">
                         <input
                           type="text"
                           value={newName}
                           onChange={(e) => setNewName(e.target.value)}
                           className="flex-1 p-1 border border-blue-300 rounded text-sm outline-none"
                           autoFocus
                         />
                         <button onClick={handleSave} className="p-1 text-green-600 hover:bg-green-50 rounded"><Check size={16}/></button>
                         <button onClick={() => setEditingSub(null)} className="p-1 text-red-500 hover:bg-red-50 rounded"><X size={16}/></button>
                      </div>
                    ) : (
                      <>
                        <span className="text-sm text-gray-700 ml-2">{sub}</span>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-gray-400 mr-2">
                            {products.filter(p => p.category === category && p.subCategory === sub).length} items
                          </span>
                          <button
                            onClick={() => handleEditClick(category, sub)}
                            className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                          >
                            <Edit2 size={14} />
                          </button>
                          <button
                            onClick={() => handleDelete(category, sub)}
                            className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
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
                  <div className="flex items-center gap-2 p-3 bg-blue-50 border border-blue-200 rounded">
                    <input
                      type="text"
                      value={newSubName}
                      onChange={(e) => setNewSubName(e.target.value)}
                      className="flex-1 p-1 border border-blue-300 rounded text-sm outline-none"
                      placeholder="新しい小分類名..."
                      autoFocus
                    />
                    <button
                      onClick={() => handleAddSubCategory(category)}
                      className="p-1 text-green-600 hover:bg-green-50 rounded"
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
                    className="w-full flex items-center justify-center gap-2 p-3 text-blue-600 hover:bg-blue-50 border border-dashed border-blue-300 rounded transition-colors text-sm"
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