import React, { useState, useMemo, useCallback } from 'react';
import { Product, CATEGORIES, CategoryType } from '../types';
import { ProductCard } from '../components/ProductCard';
import { CategoryTag } from '../components/CategoryTag';
import { StockPill } from '../components/StockPill';
import { BackBar } from '../components/BackBar';
import { useSwipeBack } from '../hooks/useSwipeBack';
import { stockBtnClass } from '../utils/skuDisplay';
import { ChevronRight } from 'lucide-react';

interface FilterSearchViewProps {
  products: Product[];
}

const PRICE_RANGES = [
  { label: '全部',          min: 0,     max: Infinity },
  { label: '〜¥3,000',      min: 0,     max: 3000 },
  { label: '¥3,000–5,000',  min: 3000,  max: 5000 },
  { label: '¥5,000–10,000', min: 5000,  max: 10000 },
  { label: '¥10,000–20,000',min: 10000, max: 20000 },
  { label: '¥20,000〜',     min: 20000, max: Infinity },
];

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

export const FilterSearchView: React.FC<FilterSearchViewProps> = ({ products }) => {
  const [selectedCategory, setSelectedCategory] = useState<CategoryType | '全部'>('全部');
  const [selectedPriceRange, setSelectedPriceRange] = useState(0);
  const [inStockOnly, setInStockOnly] = useState(false);
  const [selectedModel, setSelectedModel] = useState<string | null>(null);
  const [selectedColor, setSelectedColor] = useState<string | null>(null);
  const [selectedSku, setSelectedSku] = useState<string | null>(null);

  const resetDrilldown = () => {
    setSelectedModel(null); setSelectedColor(null); setSelectedSku(null);
  };

  const filteredProducts = useMemo(() => {
    let result = products;
    if (selectedCategory !== '全部') result = result.filter(p => p.category === selectedCategory);
    const r = PRICE_RANGES[selectedPriceRange];
    result = result.filter(p => p.price >= r.min && p.price < r.max);
    if (inStockOnly) result = result.filter(p => p.stock > 0);
    return result;
  }, [products, selectedCategory, selectedPriceRange, inStockOnly]);

  const models = useMemo(() => {
    const groups: Record<string, { count: number; totalStock: number; image: string; category: CategoryType; minPrice: number }> = {};
    filteredProducts.forEach(p => {
      const key = p.modelName || p.sku;
      if (!groups[key]) groups[key] = { count: 0, totalStock: 0, image: p.imageUrl, category: p.category, minPrice: p.price };
      groups[key].count++;
      groups[key].totalStock += p.stock;
      if (!groups[key].image && p.imageUrl) groups[key].image = p.imageUrl;
      if (p.price < groups[key].minPrice) groups[key].minPrice = p.price;
    });
    return Object.entries(groups).map(([name, data]) => ({ name, ...data }))
      .sort((a, b) => a.minPrice - b.minPrice);
  }, [filteredProducts]);

  const categoryCounts = useMemo(() => {
    const r = PRICE_RANGES[selectedPriceRange];
    let pool = products.filter(p => p.price >= r.min && p.price < r.max);
    if (inStockOnly) pool = pool.filter(p => p.stock > 0);
    const counts: Record<string, number> = { '全部': pool.length };
    CATEGORIES.forEach(c => { counts[c] = pool.filter(p => p.category === c).length; });
    return counts;
  }, [products, selectedPriceRange, inStockOnly]);

  const modelProducts = useMemo(() => {
    if (!selectedModel) return [];
    return filteredProducts.filter(p => (p.modelName || p.sku) === selectedModel);
  }, [filteredProducts, selectedModel]);

  const colors = useMemo(() => {
    if (!selectedModel) return [];
    const groups: Record<string, { count: number; totalStock: number; image: string }> = {};
    modelProducts.forEach(p => {
      const c = p.color || 'デフォルト';
      if (!groups[c]) groups[c] = { count: 0, totalStock: 0, image: p.imageUrl };
      groups[c].count++;
      groups[c].totalStock += p.stock;
      if (!groups[c].image && p.imageUrl) groups[c].image = p.imageUrl;
    });
    return Object.entries(groups).map(([name, data]) => ({ name, ...data }));
  }, [modelProducts, selectedModel]);

  const hasColorVariants = useMemo(
    () => new Set(modelProducts.map(p => p.color).filter(c => c && c.trim() !== '')).size > 1,
    [modelProducts]
  );

  const colorProducts = useMemo(() => {
    if (!selectedModel) return [];
    if (selectedColor) return modelProducts.filter(p => (p.color || 'デフォルト') === selectedColor);
    return modelProducts;
  }, [modelProducts, selectedColor, selectedModel]);

  const isRacket = useMemo(() => modelProducts[0]?.category === 'ラケット', [modelProducts]);

  const handleSelectModel = (modelName: string) => {
    const modelSkus = filteredProducts.filter(p => (p.modelName || p.sku) === modelName);
    setSelectedModel(modelName);
    setSelectedColor(null);
    setSelectedSku(modelSkus.length === 1 ? modelSkus[0].sku : null);
  };

  const handleSelectColor = (colorName: string) => {
    const colorSkus = modelProducts.filter(p => (p.color || 'デフォルト') === colorName);
    setSelectedColor(colorName);
    setSelectedSku(colorSkus.length === 1 ? colorSkus[0].sku : null);
  };

  const handleBack = useCallback(() => {
    if (selectedSku) { setSelectedSku(null); return; }
    if (selectedColor) { setSelectedColor(null); return; }
    if (selectedModel) { setSelectedModel(null); setSelectedColor(null); return; }
  }, [selectedSku, selectedColor, selectedModel]);

  const canGoBack = !!(selectedModel || selectedColor || selectedSku);
  useSwipeBack(handleBack, { enabled: canGoBack });

  const selectedProduct = selectedSku ? products.find(p => p.sku === selectedSku) : null;

  // ── Single SKU detail ──
  const isSingleSku = selectedModel && colorProducts.length === 1 && selectedSku;
  if (isSingleSku && selectedProduct) {
    return (
      <div className="max-w-5xl mx-auto px-4 md:px-6 py-5 md:py-6">
        <BackBar onBack={handleBack} label={selectedColor ? 'カラー選択に戻る' : 'Model一覧に戻る'} />
        <ProductCard product={selectedProduct} variant="detail" />
      </div>
    );
  }

  // ── Size/Spec matrix ──
  const showSizeView = selectedModel && (selectedColor || !hasColorVariants);
  if (showSizeView && colorProducts.length > 1) {
    const sizes = sortSizes(Array.from(new Set(colorProducts.map(p => p.size).filter(s => s && s.trim() !== ''))));
    const totalStock = colorProducts.reduce((sum, p) => sum + p.stock, 0);

    return (
      <div className="max-w-5xl mx-auto px-4 md:px-6 py-5 md:py-6">
        <BackBar onBack={handleBack} label={selectedColor ? 'カラー選択に戻る' : 'Model一覧に戻る'} />

        <div className="vi-card p-4 md:p-5 mb-4 flex items-center gap-4">
          {colorProducts[0]?.imageUrl ? (
            <img src={colorProducts[0].imageUrl} alt="" className="w-20 h-20 object-contain rounded-lg bg-stone-50 flex-shrink-0" />
          ) : (
            <div className="vi-ph w-20 h-20 flex-shrink-0 text-xs">{(selectedModel || '').slice(0, 7)}</div>
          )}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              {modelProducts[0] && <CategoryTag category={modelProducts[0].category} />}
              {selectedColor && <span className="text-xs font-bold text-stone-600 mono">{selectedColor}</span>}
            </div>
            <h2 className="product-sku product-sku-mono text-lg truncate">{selectedColor || selectedModel}</h2>
            <div className="flex items-center gap-2 mt-2 flex-wrap">
              <span className="text-xs font-bold text-stone-500 mono">{colorProducts.length} SKU</span>
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
              ? colorProducts.map(p => ({ p, label: [p.weightClass, p.gripSize].filter(Boolean).join(' ') || p.sku }))
              : sizes.length > 0
                ? sizes.map(size => {
                    const p = colorProducts.find(x => x.size === size);
                    return p ? { p, label: size } : null;
                  }).filter(Boolean) as Array<{ p: Product; label: string }>
                : colorProducts.map(p => ({ p, label: p.sku }))
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

  // ── Color selection ──
  if (selectedModel && hasColorVariants) {
    return (
      <div className="max-w-5xl mx-auto px-4 md:px-6 py-5 md:py-6">
        <BackBar onBack={handleBack} label="Model一覧に戻る" />

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

  // ── Filter form + model list (Level 0) ──
  return (
    <div className="max-w-5xl mx-auto px-4 md:px-6 py-5 md:py-6">
      <h2 className="page-title md:page-title-desk mb-1">条件で絞り込み</h2>
      <p className="text-sm text-stone-500 mb-5">カテゴリー、価格帯、在庫で商品を探せます</p>

      {/* Filters */}
      <div className="vi-card p-4 md:p-5 mb-5 space-y-5">
        <div>
          <div className="label">カテゴリー</div>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
            <button
              onClick={() => { setSelectedCategory('全部'); resetDrilldown(); }}
              className={`chip justify-center ${selectedCategory === '全部' ? 'chip-active' : ''}`}
            >
              全部 ({categoryCounts['全部']})
            </button>
            {CATEGORIES.map(c => (
              <button
                key={c}
                onClick={() => { setSelectedCategory(c); resetDrilldown(); }}
                className={`chip justify-center ${selectedCategory === c ? 'chip-active' : ''}`}
              >
                {c} ({categoryCounts[c]})
              </button>
            ))}
          </div>
        </div>

        <div>
          <div className="label">価格帯</div>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
            {PRICE_RANGES.map((range, idx) => (
              <button
                key={idx}
                onClick={() => { setSelectedPriceRange(idx); resetDrilldown(); }}
                className={`chip justify-center ${selectedPriceRange === idx ? 'chip-active' : ''}`}
              >
                {range.label}
              </button>
            ))}
          </div>
        </div>

        <div>
          <div className="label">在庫</div>
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => { setInStockOnly(false); resetDrilldown(); }}
              className={`chip justify-center ${!inStockOnly ? 'chip-active' : ''}`}
            >
              全部
            </button>
            <button
              onClick={() => { setInStockOnly(true); resetDrilldown(); }}
              className={`chip justify-center ${inStockOnly ? 'chip-active' : ''}`}
            >
              在庫あり
            </button>
          </div>
        </div>
      </div>

      {/* Result */}
      <div className="flex items-baseline justify-between mb-3">
        <span className="section-label">検索結果 {models.length} モデル</span>
        {models.length > 0 && <span className="text-xs text-stone-400 mono">価格順</span>}
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
                <div className="flex items-center gap-2 mb-1">
                  <CategoryTag category={model.category} />
                  <span className="text-[12px] text-stone-500 font-semibold mono">{model.count} アイテム</span>
                </div>
                <div className="product-sku product-sku-mono text-base truncate">{model.name}</div>
                <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                  <span className="text-sm font-bold text-stone-700 mono">¥{model.minPrice.toLocaleString()}〜</span>
                  <StockPill stock={model.totalStock} size="sm" labelPrefix="計" />
                </div>
              </div>
              <ChevronRight className="text-stone-300 flex-shrink-0" size={20} />
            </button>
          ))}
        </div>
      ) : (
        <div className="py-16 text-center text-stone-400 vi-card">
          <p className="font-medium">該当する商品がありません</p>
          <p className="text-sm mt-1">条件を変更してください</p>
        </div>
      )}
    </div>
  );
};
