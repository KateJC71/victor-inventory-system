import React, { useState, useMemo } from 'react';
import { Product, CategoryType, CATEGORIES } from '../types';
import { ProductCard } from '../components/ProductCard';
import { Search, X } from 'lucide-react';

interface SingleSearchViewProps {
  products: Product[];
}

type FilterKey = 'all' | CategoryType | 'inStock';

export const SingleSearchView: React.FC<SingleSearchViewProps> = ({ products }) => {
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<FilterKey>('all');

  const filteredByQuery = useMemo(() => {
    if (!query.trim()) return [];
    const q = query.toLowerCase();
    return products.filter(p =>
      p.sku.toLowerCase().includes(q) ||
      p.name.toLowerCase().includes(q) ||
      p.modelName?.toLowerCase().includes(q) ||
      p.masterName?.toLowerCase().includes(q)
    );
  }, [query, products]);

  const counts = useMemo(() => {
    const c: Record<string, number> = { all: filteredByQuery.length, inStock: filteredByQuery.filter(p => p.stock > 0).length };
    CATEGORIES.forEach(cat => { c[cat] = filteredByQuery.filter(p => p.category === cat).length; });
    return c;
  }, [filteredByQuery]);

  const results = useMemo(() => {
    if (filter === 'all') return filteredByQuery;
    if (filter === 'inStock') return filteredByQuery.filter(p => p.stock > 0);
    return filteredByQuery.filter(p => p.category === filter);
  }, [filteredByQuery, filter]);

  const handleClear = () => { setQuery(''); setFilter('all'); };

  return (
    <div className="max-w-7xl mx-auto px-4 md:px-8 py-5 md:py-6">
      {/* Search bar */}
      <div className="relative max-w-3xl mx-auto">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-500" size={20} strokeWidth={2.5} />
        <label htmlFor="single-search" className="sr-only">SKU または商品名で検索</label>
        <input
          id="single-search"
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="SKU・商品名・モデル名で検索"
          className="field field-lg"
          autoComplete="off"
        />
        {query && (
          <button
            onClick={handleClear}
            className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 text-stone-500 hover:text-stone-900 rounded-full"
            aria-label="検索をクリア"
          >
            <X size={18} />
          </button>
        )}
      </div>

      {/* Category filter chips */}
      {query.trim() && filteredByQuery.length > 0 && (
        <div className="max-w-3xl mx-auto mt-3 flex gap-2 overflow-x-auto no-scrollbar -mx-1 px-1 pb-1">
          <button onClick={() => setFilter('all')} className={`chip ${filter === 'all' ? 'chip-active' : ''}`}>
            すべて {counts.all}
          </button>
          <button onClick={() => setFilter('inStock')} className={`chip ${filter === 'inStock' ? 'chip-active' : ''}`}>
            在庫あり {counts.inStock}
          </button>
          {CATEGORIES.filter(cat => counts[cat] > 0).map(cat => (
            <button key={cat} onClick={() => setFilter(cat)} className={`chip ${filter === cat ? 'chip-active' : ''}`}>
              {cat} {counts[cat]}
            </button>
          ))}
        </div>
      )}

      {/* Results */}
      <div className="mt-6">
        {query === '' ? (
          <div className="text-center py-24 text-stone-500">
            <Search className="mx-auto text-stone-300 mb-3" size={40} strokeWidth={1.5} />
            <p className="text-base font-medium">SKU または商品名を入力してください</p>
            <p className="text-sm mt-1 text-stone-400">部分一致で検索できます</p>
          </div>
        ) : results.length === 0 ? (
          <div className="text-center py-20 text-stone-500">
            <p className="text-base font-medium">該当する商品は見つかりませんでした</p>
            <p className="text-sm mt-1 text-stone-400">別のキーワードで試してみてください</p>
          </div>
        ) : (
          <>
            <div className="flex items-baseline justify-between mb-4 max-w-3xl md:max-w-none mx-auto">
              <span className="section-label">検索結果</span>
              <span className="text-sm font-semibold text-stone-600 mono">{results.length} 件</span>
            </div>

            {/* Mobile: row cards (horizontal layout); Desktop: grid */}
            <div className="md:hidden space-y-3 max-w-2xl mx-auto">
              {results.map(product => (
                <ProductCard key={product.sku} product={product} variant="row" />
              ))}
            </div>
            <div className="hidden md:grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
              {results.map(product => (
                <ProductCard key={product.sku} product={product} variant="grid" />
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
};
