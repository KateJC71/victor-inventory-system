import React, { useState, useMemo } from 'react';
import { Product } from '../types';
import { ProductCard } from '../components/ProductCard';
import { ProductDetailModal } from '../components/ProductDetailModal';
import { CategoryTag } from '../components/CategoryTag';
import { StockPill, StockPillCount } from '../components/StockPill';
import { ChevronDown, ChevronUp, Search, X } from 'lucide-react';

interface ModelSearchViewProps {
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

export const ModelSearchView: React.FC<ModelSearchViewProps> = ({ products }) => {
  const [query, setQuery] = useState('');
  const [expandedModel, setExpandedModel] = useState<string | null>(null);
  const [viewedProduct, setViewedProduct] = useState<Product | null>(null);

  const grouped = useMemo(() => {
    if (!query.trim()) return {} as Record<string, Product[]>;
    const q = query.toLowerCase();
    const filtered = products.filter(p =>
      p.modelName?.toLowerCase().includes(q) || p.sku.toLowerCase().includes(q)
    );
    const groups: Record<string, Product[]> = {};
    filtered.forEach(p => {
      const key = p.modelName || p.sku;
      if (!groups[key]) groups[key] = [];
      groups[key].push(p);
    });
    return groups;
  }, [query, products]);

  const modelNames = Object.keys(grouped).sort();

  const handleHeaderClick = (model: string, items: Product[]) => {
    // Single-SKU model: open detail directly
    if (items.length === 1) {
      setViewedProduct(items[0]);
      return;
    }
    // Multi-SKU: toggle expand
    setExpandedModel(expandedModel === model ? null : model);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 md:px-8 py-5 md:py-6">
      {/* Search */}
      <div className="relative max-w-3xl mx-auto">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-500" size={20} strokeWidth={2.5} />
        <label htmlFor="model-search" className="sr-only">Model Name で検索</label>
        <input
          id="model-search"
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Model Name で検索 (例: A170)"
          className="field field-lg"
          autoComplete="off"
        />
        {query && (
          <button onClick={() => setQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 text-stone-500 hover:text-stone-900 rounded-full" aria-label="クリア">
            <X size={18} />
          </button>
        )}
      </div>

      <div className="mt-6">
        {query === '' ? (
          <div className="text-center py-24 text-stone-500">
            <p className="text-base font-medium">Model Name を入力してください</p>
            <p className="text-sm mt-1 text-stone-400">在庫マトリクスが表示されます</p>
          </div>
        ) : modelNames.length === 0 ? (
          <div className="text-center py-20 text-stone-500">
            <p className="text-base font-medium">該当するモデルは見つかりませんでした</p>
          </div>
        ) : (
          <div className="space-y-3 md:grid md:grid-cols-2 md:gap-5 md:space-y-0">
            {modelNames.map(model => {
              const items = grouped[model];
              const isExpanded = expandedModel === model;
              const colors = Array.from(new Set(items.map(i => i.color).filter(Boolean))).sort();
              const sizes = sortSizes(Array.from(new Set(items.map(i => i.size).filter(Boolean))));
              const hasMatrix = colors.length > 0 && sizes.length > 0;
              const colorImages: Record<string, string> = {};
              items.forEach(it => { if (!colorImages[it.color]) colorImages[it.color] = it.imageUrl; });
              const prices = items.map(i => i.price);
              const minP = Math.min(...prices), maxP = Math.max(...prices);
              const priceStr = minP === maxP ? `¥${minP.toLocaleString()}` : `¥${minP.toLocaleString()} 〜 ¥${maxP.toLocaleString()}`;
              const totalStock = items.reduce((a, c) => a + c.stock, 0);
              const cat = items[0].category;
              const sub = items[0].subCategory;
              const isSingleSku = items.length === 1;

              return (
                <div key={model} className={`vi-card overflow-hidden ${!isExpanded ? 'vi-card-hover' : ''}`}>
                  <button
                    onClick={() => handleHeaderClick(model, items)}
                    className="w-full p-4 flex items-start justify-between gap-3 text-left"
                    aria-expanded={!isSingleSku ? isExpanded : undefined}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1.5">
                        <CategoryTag category={cat} />
                        <span className="text-[13px] text-stone-500 font-semibold">{items.length} アイテム</span>
                      </div>
                      <div className="product-sku product-sku-mono">{model}</div>
                      {sub && <div className="product-meta mt-0.5">{sub}</div>}
                    </div>
                    <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
                      <div className="text-sm font-bold text-stone-900 mono whitespace-nowrap">{priceStr}</div>
                      <StockPill stock={totalStock} labelPrefix="計" />
                      {!isSingleSku && (
                        isExpanded
                          ? <ChevronUp size={18} className="text-stone-400" />
                          : <ChevronDown size={18} className="text-stone-400" />
                      )}
                    </div>
                  </button>

                  {isExpanded && !isSingleSku && (
                    <>
                      <div className="vi-divider"></div>
                      <div className="p-4 bg-stone-50">
                        {hasMatrix ? (
                          <>
                            {colors.length > 0 && (
                              <div className="flex gap-3 mb-3 overflow-x-auto no-scrollbar -mx-1 px-1 pb-1">
                                {colors.map(color => (
                                  <div key={color} className="text-center flex-shrink-0">
                                    {colorImages[color] ? (
                                      <img src={colorImages[color]} alt={color} className="w-14 h-14 object-cover rounded-lg mb-1 bg-stone-100" loading="lazy" />
                                    ) : (
                                      <div className="vi-ph w-14 h-14 mb-1 text-xs">{color}</div>
                                    )}
                                    <div className="text-[12px] font-bold text-stone-700">{color}</div>
                                  </div>
                                ))}
                              </div>
                            )}

                            <div className="overflow-x-auto">
                              <table className="matrix">
                                <thead>
                                  <tr>
                                    <th>Size</th>
                                    {colors.map(c => <th key={c}>{c}</th>)}
                                    <th className="text-right">計</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {sizes.map(size => {
                                    const rowTotal = colors.reduce((sum, color) => {
                                      const p = items.find(i => i.color === color && i.size === size);
                                      return sum + (p?.stock ?? 0);
                                    }, 0);
                                    return (
                                      <tr key={size}>
                                        <td>{size}</td>
                                        {colors.map(color => {
                                          const p = items.find(i => i.color === color && i.size === size);
                                          return (
                                            <td key={color}>
                                              {p ? (
                                                <button
                                                  onClick={() => setViewedProduct(p)}
                                                  className="focus:outline-none focus-visible:ring-2 focus-visible:ring-stone-900 rounded-full"
                                                  aria-label={`${p.sku} の詳細を表示`}
                                                >
                                                  <StockPillCount stock={p.stock} />
                                                </button>
                                              ) : (
                                                <span className="text-stone-300 mono">—</span>
                                              )}
                                            </td>
                                          );
                                        })}
                                        <td className="text-right mono font-bold text-stone-500">{rowTotal || '—'}</td>
                                      </tr>
                                    );
                                  })}
                                </tbody>
                              </table>
                            </div>

                            <p className="text-xs text-stone-400 mt-3 text-right">数字をタップして詳細を表示</p>
                          </>
                        ) : (
                          /* Fallback: flat SKU list (no clear color × size axes) */
                          <div className="space-y-2">
                            <p className="text-xs text-stone-500 mb-2 font-semibold">SKU 一覧（タップで詳細を表示）</p>
                            {items.map(p => (
                              <ProductCard key={p.sku} product={p} variant="row" onClick={setViewedProduct} />
                            ))}
                          </div>
                        )}
                      </div>
                    </>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      <ProductDetailModal product={viewedProduct} onClose={() => setViewedProduct(null)} />
    </div>
  );
};
