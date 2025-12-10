import React, { useState, useMemo } from 'react';
import { Product } from '../types';
import { ProductCard } from '../components/ProductCard';
import { Search, X } from 'lucide-react';

interface SingleSearchViewProps {
  products: Product[];
}

export const SingleSearchView: React.FC<SingleSearchViewProps> = ({ products }) => {
  const [query, setQuery] = useState('');

  const filteredProducts = useMemo(() => {
    if (!query.trim()) return [];
    const lowerQuery = query.toLowerCase();
    return products.filter(p =>
      p.sku.toLowerCase().includes(lowerQuery) ||
      p.name.toLowerCase().includes(lowerQuery) ||
      p.modelName?.toLowerCase().includes(lowerQuery)
    );
  }, [query, products]);

  return (
    <div className="p-4 space-y-4 max-w-3xl mx-auto min-h-[80vh]">
      <div className="bg-white rounded-lg p-1 shadow-sm border border-gray-200 flex items-center sticky top-[105px] z-40">
        <Search className="ml-3 text-gray-400" size={20} />
        <input 
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="SKUまたは商品名を入力..."
          className="w-full p-3 outline-none text-gray-700 placeholder:text-gray-400 bg-transparent"
        />
        {query && (
          <button onClick={() => setQuery('')} className="p-2 text-gray-400 hover:text-gray-600">
            <X size={20} />
          </button>
        )}
      </div>

      <div className="mt-4">
        {query === '' ? (
          <div className="text-center py-20 text-gray-400">
            <p className="text-sm">SKUを入力して検索してください</p>
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="text-center py-20 text-gray-500">
            <p>該当する商品は見つかりませんでした。</p>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex justify-between items-center px-1">
               <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">検索結果</span>
               <span className="text-xs bg-gray-200 text-gray-600 px-2 py-1 rounded-full">{filteredProducts.length}件</span>
            </div>
            {filteredProducts.map(product => (
              <ProductCard key={product.sku} product={product} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};