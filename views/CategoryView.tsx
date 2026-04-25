import React, { useState, useMemo } from 'react';
import { Product, CATEGORIES, CategoryType } from '../types';
import { ProductCard } from '../components/ProductCard';
import { CategoryTag } from '../components/CategoryTag';
import { StockPill } from '../components/StockPill';
import { ChevronRight, ArrowLeft } from 'lucide-react';

interface CategoryViewProps {
  products: Product[];
}

const sortSizes = (sizes: string[]) => {
  const order = ['XXS', 'XS', 'S', 'M', 'L', 'XL', 'XXL', '2XL', '3XL', '4XL'];
  return [...sizes].sort((a, b) => {
    const numA = parseFloat(a.replace(/[^0-9.]/g, ''));
    const numB = parseFloat(b.replace(/[^0-9.]/g, ''));
    if (!isNaN(numA) && !isNaN(numB) && numA !== numB) return numA - numB;
    const iA = order.indexOf(a.toUpperCase());
    const iB = order.indexOf(b.toUpperCase());
    if (iA !== -1 && iB !== -1) return iA - iB;
    if (iA !== -1) return -1;
    if (iB !== -1) return 1;
    return a.localeCompare(b);
  });
};

// Stock-state class for matrix buttons (signal traffic-light without conflicting with category palette)
const stockBtnClass = (stock: number, selected: boolean) => {
  if (selected) return 'bg-stone-900 text-white border-stone-900';
  if (stock <= 0)  return 'bg-red-50 text-red-700 border-red-200 hover:border-red-400';
  if (stock < 5)   return 'bg-orange-50 text-orange-700 border-orange-200 hover:border-orange-400';
  return 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:border-emerald-400';
};

export const CategoryView: React.FC<CategoryViewProps> = ({ products }) => {
  const [selectedCategory, setSelectedCategory] = useState<CategoryType | null>(null);
  const [selectedSubCategory, setSelectedSubCategory] = useState<string | null>(null);
  const [selectedModel, setSelectedModel] = useState<string | null>(null);
  const [selectedColor, setSelectedColor] = useState<string | null>(null);
  const [selectedSku, setSelectedSku] = useState<string | null>(null);

  // ---- Aggregations ----
  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    CATEGORIES.forEach(c => counts[c] = 0);
    products.forEach(p => { if (counts[p.category] !== undefined) counts[p.category]++; });
    return counts;
  }, [products]);

  const subCategories = useMemo(() => {
    if (!selectedCategory) return [];
    const subs = new Set<string>();
    const counts: Record<string, number> = {};
    products
      .filter(p => p.category === selectedCategory)
      .forEach(p => {
        const sub = p.subCategory && p.subCategory.trim() !== '' ? p.subCategory : 'General';
        subs.add(sub);
        counts[sub] = (counts[sub] || 0) + 1;
      });
    return Array.from(subs).sort().map(sub => ({ name: sub, count: counts[sub] }));
  }, [selectedCategory, products]);

  const models = useMemo(() => {
    if (!selectedCategory || !selectedSubCategory) return [];
    const filtered = products.filter(p =>
      p.category === selectedCategory &&
      (p.subCategory === selectedSubCategory || (!p.subCategory && selectedSubCategory === 'General'))
    );
    const groups: Record<string, { count: number; image: string; totalStock: number }> = {};
    filtered.forEach(p => {
      if (!groups[p.modelName]) {
        groups[p.modelName] = { count: 0, image: p.imageUrl, totalStock: 0 };
      }
      groups[p.modelName].count++;
      groups[p.modelName].totalStock += p.stock;
      if (!groups[p.modelName].image && p.imageUrl) groups[p.modelName].image = p.imageUrl;
    });
    return Object.entries(groups).map(([name, data]) => ({ name, ...data }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [selectedCategory, selectedSubCategory, products]);

  const handleSelectModel = (modelName: string) => {
    const modelSkus = products.filter(p =>
      p.category === selectedCategory &&
      (p.subCategory === selectedSubCategory || (!p.subCategory && selectedSubCategory === 'General')) &&
      p.modelName === modelName
    );
    if (modelSkus.length === 1) {
      setSelectedModel(modelName);
      setSelectedColor(null);
      setSelectedSku(modelSkus[0].sku);
    } else {
      setSelectedSku(null);
      setSelectedColor(null);
      setSelectedModel(modelName);
    }
  };

  const handleSelectColor = (colorName: string) => {
    const colorSkus = products.filter(p =>
      p.category === selectedCategory &&
      (p.subCategory === selectedSubCategory || (!p.subCategory && selectedSubCategory === 'General')) &&
      p.modelName === selectedModel &&
      p.color === colorName
    );
    if (colorSkus.length === 1) {
      setSelectedColor(colorName);
      setSelectedSku(colorSkus[0].sku);
    } else {
      setSelectedSku(null);
      setSelectedColor(colorName);
    }
  };

  const colors = useMemo(() => {
    if (!selectedCategory || !selectedSubCategory || !selectedModel) return [];
    const filtered = products.filter(p =>
      p.category === selectedCategory &&
      (p.subCategory === selectedSubCategory || (!p.subCategory && selectedSubCategory === 'General')) &&
      p.modelName === selectedModel
    );
    const groups: Record<string, { count: number; image: string; totalStock: number }> = {};
    filtered.forEach(p => {
      if (!groups[p.color]) groups[p.color] = { count: 0, image: p.imageUrl, totalStock: 0 };
      groups[p.color].count++;
      groups[p.color].totalStock += p.stock;
      if (!groups[p.color].image && p.imageUrl) groups[p.color].image = p.imageUrl;
    });
    return Object.entries(groups).map(([name, data]) => ({ name, ...data }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [selectedCategory, selectedSubCategory, selectedModel, products]);

  const displayedProducts = useMemo(() => {
    if (!selectedCategory || !selectedSubCategory || !selectedModel) return [];
    let filtered = products.filter(p =>
      p.category === selectedCategory &&
      (p.subCategory === selectedSubCategory || (!p.subCategory && selectedSubCategory === 'General')) &&
      p.modelName === selectedModel
    );
    if (selectedColor) filtered = filtered.filter(p => p.color === selectedColor);
    return filtered;
  }, [selectedCategory, selectedSubCategory, selectedModel, selectedColor, products]);

  const hasColorVariants = useMemo(() => {
    if (!selectedCategory || !selectedSubCategory || !selectedModel) return false;
    const uniqueColors = new Set(
      products
        .filter(p =>
          p.category === selectedCategory &&
          (p.subCategory === selectedSubCategory || (!p.subCategory && selectedSubCategory === 'General')) &&
          p.modelName === selectedModel
        )
        .map(p => p.color)
        .filter(c => c && c.trim() !== '')
    );
    return uniqueColors.size > 1;
  }, [selectedCategory, selectedSubCategory, selectedModel, products]);

  // ---- Common breadcrumb ----
  const Breadcrumb: React.FC<{ items: Array<{ label: string; onClick?: () => void }> }> = ({ items }) => (
    <nav className="crumb mb-4 flex-wrap" aria-label="パンくずリスト">
      {items.map((item, i) => (
        <React.Fragment key={i}>
          {i > 0 && <span className="crumb-sep">›</span>}
          {item.onClick ? (
            <button onClick={item.onClick}>{item.label}</button>
          ) : (
            <span className="crumb-current">{item.label}</span>
          )}
        </React.Fragment>
      ))}
    </nav>
  );

  const BackBtn: React.FC<{ onClick: () => void; label: string }> = ({ onClick, label }) => (
    <button onClick={onClick} className="btn btn-secondary mb-5">
      <ArrowLeft size={18} />
      {label}
    </button>
  );

  // ─────────────────────────────────────────────────────
  // LEVEL 6 — Single SKU detail
  // ─────────────────────────────────────────────────────
  const isSingleSku = selectedModel && displayedProducts.length === 1 && selectedSku;
  const singleProduct = isSingleSku ? products.find(p => p.sku === selectedSku) : null;

  if (isSingleSku && singleProduct) {
    return (
      <div className="max-w-5xl mx-auto px-4 md:px-6 py-5 md:py-6">
        <BackBtn
          onClick={() => { setSelectedModel(null); setSelectedColor(null); setSelectedSku(null); }}
          label="Model選択に戻る"
        />
        <ProductCard product={singleProduct} variant="detail" />
      </div>
    );
  }

  // ─────────────────────────────────────────────────────
  // LEVEL 5 — Matrix (size/spec grid)
  // ─────────────────────────────────────────────────────
  const showMatrix = selectedCategory && selectedSubCategory && selectedModel && (selectedColor || !hasColorVariants);

  if (showMatrix && displayedProducts.length > 1) {
    const isRacket = selectedCategory === 'ラケット';
    const sizes = sortSizes(Array.from(new Set(displayedProducts.map(p => p.size).filter(s => s && s.trim() !== ''))));
    const totalStock = displayedProducts.reduce((sum, p) => sum + p.stock, 0);
    const selectedProduct = selectedSku ? products.find(p => p.sku === selectedSku) : null;
    const handleBack = () => {
      if (selectedColor) setSelectedColor(null);
      else setSelectedModel(null);
    };

    return (
      <div className="max-w-5xl mx-auto px-4 md:px-6 py-5 md:py-6">
        <BackBtn onClick={handleBack} label={selectedColor ? 'カラー選択に戻る' : 'Model選択に戻る'} />

        <Breadcrumb items={[
          { label: selectedCategory!, onClick: () => { setSelectedSubCategory(null); setSelectedModel(null); setSelectedColor(null); setSelectedSku(null); } },
          { label: selectedSubCategory!, onClick: () => { setSelectedModel(null); setSelectedColor(null); setSelectedSku(null); } },
          { label: selectedModel!, onClick: selectedColor ? () => { setSelectedColor(null); setSelectedSku(null); } : undefined },
          ...(selectedColor ? [{ label: selectedColor }] : []),
        ]} />

        <div className="vi-card p-4 md:p-5 mb-4 flex items-center gap-4">
          {displayedProducts[0]?.imageUrl ? (
            <img src={displayedProducts[0].imageUrl} alt="" className="w-20 h-20 object-contain rounded-lg bg-stone-50 flex-shrink-0" />
          ) : (
            <div className="vi-ph w-20 h-20 flex-shrink-0 text-xs">{(selectedModel || '').slice(0, 7)}</div>
          )}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <CategoryTag category={selectedCategory!} />
              {selectedColor && <span className="text-xs font-bold text-stone-600 mono">{selectedColor}</span>}
            </div>
            <h2 className="product-sku product-sku-mono text-lg truncate">{selectedColor || selectedModel}</h2>
            <div className="flex items-center gap-2 mt-2 flex-wrap">
              <span className="text-xs font-bold text-stone-500 mono">{displayedProducts.length} SKU</span>
              <StockPill stock={totalStock} labelPrefix="計" />
            </div>
          </div>
        </div>

        <div className="vi-card overflow-hidden">
          <div className="px-4 py-3 bg-stone-50 border-b border-stone-200">
            <h3 className="font-bold text-stone-900">{isRacket ? '規格別在庫' : 'サイズ別在庫'}</h3>
            <p className="text-xs text-stone-500 mt-0.5">タップして詳細を表示</p>
          </div>

          <div className="p-3 md:p-4 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5">
            {(isRacket
              ? displayedProducts.map(p => ({ p, label: [p.weightClass, p.gripSize].filter(Boolean).join(' ') || p.sku }))
              : sizes.length > 0
                ? sizes.map(size => {
                    const p = displayedProducts.find(x => x.size === size);
                    return p ? { p, label: size } : null;
                  }).filter(Boolean) as Array<{ p: Product; label: string }>
                : displayedProducts.map(p => ({ p, label: p.sku }))
            ).map(({ p, label }) => {
              const selected = selectedSku === p.sku;
              return (
                <button
                  key={p.sku}
                  onClick={() => setSelectedSku(selected ? null : p.sku)}
                  className={`p-3 rounded-xl border-2 transition-all text-center min-h-[88px] ${stockBtnClass(p.stock, selected)}`}
                  aria-label={`${p.sku} 在庫 ${p.stock}`}
                >
                  <div className="text-sm font-bold mb-1 truncate">{label}</div>
                  <div className="text-2xl font-extrabold">{p.stock}</div>
                  <div className={`text-xs mt-1 mono ${selected ? 'text-stone-200' : 'opacity-70'}`}>¥{p.price.toLocaleString()}</div>
                </button>
              );
            })}
          </div>
        </div>

        {selectedProduct && (
          <div className="mt-6">
            <div className="section-label mb-3">選択中のSKU詳細</div>
            <ProductCard product={selectedProduct} variant="detail" />
          </div>
        )}
      </div>
    );
  }

  // ─────────────────────────────────────────────────────
  // LEVEL 4 — Color selection
  // ─────────────────────────────────────────────────────
  if (selectedCategory && selectedSubCategory && selectedModel) {
    return (
      <div className="max-w-5xl mx-auto px-4 md:px-6 py-5 md:py-6">
        <BackBtn onClick={() => setSelectedModel(null)} label="Model選択に戻る" />

        <Breadcrumb items={[
          { label: selectedCategory, onClick: () => { setSelectedSubCategory(null); setSelectedModel(null); } },
          { label: selectedSubCategory, onClick: () => setSelectedModel(null) },
          { label: selectedModel },
        ]} />

        <div className="mb-5">
          <h2 className="page-title md:page-title-desk">{selectedModel}</h2>
          <p className="text-sm text-stone-500 mt-1">カラーを選択してください</p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-4">
          {colors.map(color => (
            <button
              key={color.name}
              onClick={() => handleSelectColor(color.name)}
              className="vi-card vi-card-hover overflow-hidden text-left"
              aria-label={`カラー ${color.name}、${color.count} サイズ、在庫 ${color.totalStock}`}
            >
              <div className="aspect-square w-full bg-stone-50 relative flex items-center justify-center p-3">
                {color.image ? (
                  <img src={color.image} alt="" className="max-w-full max-h-full object-contain" />
                ) : (
                  <div className="vi-ph w-full h-full text-base">{color.name}</div>
                )}
                <div className="absolute top-2 right-2 bg-white/90 text-stone-700 text-[11px] font-bold px-2 py-0.5 rounded-full shadow-sm">
                  {color.count} サイズ
                </div>
              </div>
              <div className="p-3 flex items-center justify-between gap-2">
                <span className="font-bold text-stone-900 mono">{color.name}</span>
                <StockPill stock={color.totalStock} labelPrefix="計" />
              </div>
            </button>
          ))}
        </div>
      </div>
    );
  }

  // ─────────────────────────────────────────────────────
  // LEVEL 3 — Models
  // ─────────────────────────────────────────────────────
  if (selectedCategory && selectedSubCategory) {
    return (
      <div className="max-w-5xl mx-auto px-4 md:px-6 py-5 md:py-6">
        <BackBtn onClick={() => setSelectedSubCategory(null)} label="小分類選択に戻る" />

        <Breadcrumb items={[
          { label: selectedCategory, onClick: () => setSelectedSubCategory(null) },
          { label: selectedSubCategory },
        ]} />

        <div className="mb-5">
          <h2 className="page-title md:page-title-desk">{selectedSubCategory}</h2>
          <p className="text-sm text-stone-500 mt-1">Model を選択してください</p>
        </div>

        {models.length > 0 ? (
          <div className="space-y-3 md:grid md:grid-cols-2 md:gap-4 md:space-y-0">
            {models.map(model => (
              <button
                key={model.name}
                onClick={() => handleSelectModel(model.name)}
                className="vi-card vi-card-hover p-3 flex items-center gap-3.5 text-left"
              >
                {model.image ? (
                  <img src={model.image} alt="" className="w-16 h-16 object-contain rounded-lg bg-stone-50 flex-shrink-0" />
                ) : (
                  <div className="vi-ph w-16 h-16 flex-shrink-0 text-xs">{model.name.slice(0, 7)}</div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="product-sku product-sku-mono text-base truncate">{model.name}</div>
                  <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                    <span className="text-xs font-bold text-stone-500 mono">{model.count} アイテム</span>
                    <StockPill stock={model.totalStock} size="sm" labelPrefix="計" />
                  </div>
                </div>
                <ChevronRight className="text-stone-300 flex-shrink-0" size={20} />
              </button>
            ))}
          </div>
        ) : (
          <div className="py-16 text-center text-stone-400 vi-card">
            <p className="font-medium">このカテゴリには Model が見つかりません</p>
          </div>
        )}
      </div>
    );
  }

  // ─────────────────────────────────────────────────────
  // LEVEL 2 — SubCategories
  // ─────────────────────────────────────────────────────
  if (selectedCategory) {
    return (
      <div className="max-w-5xl mx-auto px-4 md:px-6 py-5 md:py-6">
        <BackBtn onClick={() => setSelectedCategory(null)} label="カテゴリー選択に戻る" />

        <Breadcrumb items={[{ label: selectedCategory }]} />

        <div className="mb-5 flex items-center gap-3">
          <CategoryTag category={selectedCategory} />
          <h2 className="page-title md:page-title-desk">{selectedCategory}</h2>
        </div>
        <p className="text-sm text-stone-500 -mt-3 mb-5">小分類を選択してください</p>

        {subCategories.length > 0 ? (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {subCategories.map(sub => (
              <button
                key={sub.name}
                onClick={() => setSelectedSubCategory(sub.name)}
                className="vi-card vi-card-hover p-4 text-left flex flex-col h-full min-h-[96px]"
              >
                <div className="flex items-start justify-between mb-2">
                  <span className="text-xs font-bold text-stone-500 mono">{sub.count} アイテム</span>
                  <ChevronRight size={16} className="text-stone-300 flex-shrink-0 mt-0.5" />
                </div>
                <span className="font-bold text-stone-900 mt-auto">{sub.name}</span>
              </button>
            ))}
          </div>
        ) : (
          <div className="py-16 text-center text-stone-400 vi-card">
            <p className="font-medium">小分類がありません</p>
          </div>
        )}
      </div>
    );
  }

  // ─────────────────────────────────────────────────────
  // LEVEL 1 — Main Categories
  // ─────────────────────────────────────────────────────
  return (
    <div className="max-w-5xl mx-auto px-4 md:px-6 py-5 md:py-6">
      <h2 className="page-title md:page-title-desk mb-1">カテゴリーから探す</h2>
      <p className="text-sm text-stone-500 mb-5">大分類を選択してください</p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {CATEGORIES.map(category => (
          <button
            key={category}
            onClick={() => setSelectedCategory(category)}
            className="vi-card vi-card-hover p-4 flex items-center justify-between gap-3 text-left"
          >
            <CategoryTag category={category} />
            <div className="flex items-center gap-3">
              <span className="text-sm font-bold text-stone-500 mono">{categoryCounts[category]} アイテム</span>
              <ChevronRight className="text-stone-300" size={20} />
            </div>
          </button>
        ))}
      </div>
    </div>
  );
};
