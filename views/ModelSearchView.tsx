
import React, { useState, useMemo } from 'react';
import { Product } from '../types';
import { ProductCard } from '../components/ProductCard';
import { Layers, ChevronDown, ChevronUp, Search, X, Grid3X3 } from 'lucide-react';

interface ModelSearchViewProps {
  products: Product[];
}

export const ModelSearchView: React.FC<ModelSearchViewProps> = ({ products }) => {
  const [query, setQuery] = useState('');
  const [expandedModel, setExpandedModel] = useState<string | null>(null);
  const [selectedVariant, setSelectedVariant] = useState<Product | null>(null);

  // Group products by Model Name
  const groupedProducts = useMemo(() => {
    if (!query.trim()) return {};

    const lowerQuery = query.toLowerCase();
    const filtered = products.filter(p => 
      p.modelName.toLowerCase().includes(lowerQuery) ||
      p.sku.toLowerCase().includes(lowerQuery)
    );

    const groups: Record<string, Product[]> = {};
    filtered.forEach(p => {
      if (!groups[p.modelName]) {
        groups[p.modelName] = [];
      }
      groups[p.modelName].push(p);
    });
    return groups;
  }, [query, products]);

  const modelNames = Object.keys(groupedProducts).sort();

  // Helper to sort sizes logically (Numeric -> XS/S/M/L -> Alpha)
  const sortSizes = (sizes: string[]) => {
    const sizeOrder = ['XXS', 'XS', 'S', 'M', 'L', 'XL', 'XXL', '2XL', '3XL', '4XL'];
    
    return [...sizes].sort((a, b) => {
      // 1. Try numeric comparison (e.g., 23.0 vs 24.5)
      const numA = parseFloat(a.replace(/[^0-9.]/g, ''));
      const numB = parseFloat(b.replace(/[^0-9.]/g, ''));

      if (!isNaN(numA) && !isNaN(numB) && numA !== numB) {
        return numA - numB;
      }

      // 2. Try standard clothing sizes
      const idxA = sizeOrder.indexOf(a.toUpperCase());
      const idxB = sizeOrder.indexOf(b.toUpperCase());
      
      if (idxA !== -1 && idxB !== -1) return idxA - idxB;
      if (idxA !== -1) return -1;
      if (idxB !== -1) return 1;

      // 3. Fallback to string
      return a.localeCompare(b);
    });
  };

  const handleModelClick = (model: string) => {
    if (expandedModel === model) {
      setExpandedModel(null);
      setSelectedVariant(null);
    } else {
      setExpandedModel(model);
      setSelectedVariant(null);
    }
  };

  const handleVariantClick = (product: Product) => {
    setSelectedVariant(product);
  };

  return (
    <div className="p-4 space-y-4 max-w-3xl mx-auto min-h-[80vh]">
       <div className="bg-white rounded-lg p-1 shadow-sm border border-gray-200 flex items-center sticky top-[105px] z-40">
        <Layers className="ml-3 text-gray-400" size={20} />
        <input 
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Model Name (例: A170)..."
          className="w-full p-3 outline-none text-gray-700 placeholder:text-gray-400 bg-transparent"
        />
         {query && (
          <button onClick={() => setQuery('')} className="p-2 text-gray-400 hover:text-gray-600">
            <X size={20} />
          </button>
        )}
      </div>

      <div className="mt-2">
        {query === '' ? (
           <div className="text-center py-20 text-gray-400">
             <p className="text-sm">Model Nameを入力して検索してください</p>
             <p className="text-xs mt-2 opacity-60">在庫マトリクスが表示されます</p>
           </div>
        ) : modelNames.length === 0 ? (
          <div className="text-center py-20 text-gray-500">
            <p>該当するモデルは見つかりませんでした。</p>
          </div>
        ) : (
          <div className="space-y-4">
            {modelNames.map(model => {
              const items = groupedProducts[model];
              const isExpanded = expandedModel === model || modelNames.length === 1;
              
              // Get unique Colors and Sizes for Matrix
              const colors = Array.from(new Set(items.map(i => i.color))).sort();
              const sizes = sortSizes(Array.from(new Set(items.map(i => i.size))));

              // Map colors to representative images (take the first one found for that color)
              const colorImages: Record<string, string> = {};
              items.forEach(item => {
                if (!colorImages[item.color]) {
                  colorImages[item.color] = item.imageUrl;
                }
              });

              // Calculate range price & total stock
              const prices = items.map(i => i.price);
              const minPrice = Math.min(...prices);
              const maxPrice = Math.max(...prices);
              const priceDisplay = minPrice === maxPrice 
                ? `¥${minPrice.toLocaleString()}` 
                : `¥${minPrice.toLocaleString()} - ¥${maxPrice.toLocaleString()}`;
              const totalStock = items.reduce((acc, curr) => acc + curr.stock, 0);

              return (
                <div key={model} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                  {/* Header */}
                  <button 
                    onClick={() => handleModelClick(model)}
                    className={`w-full flex items-center justify-between p-4 transition-colors ${isExpanded ? 'bg-blue-50 border-b border-blue-100' : 'bg-white hover:bg-gray-50'}`}
                  >
                    <div className="text-left">
                      <div className="flex items-center gap-2">
                        <Grid3X3 size={16} className="text-blue-600"/>
                        <h3 className="font-bold text-lg text-gray-900">{model}</h3>
                      </div>
                      <p className="text-xs text-gray-500 mt-0.5">在庫計: {totalStock}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-semibold text-gray-600">{priceDisplay}</span>
                      {isExpanded ? <ChevronUp size={20} className="text-gray-400"/> : <ChevronDown size={20} className="text-gray-400"/>}
                    </div>
                  </button>
                  
                  {/* Matrix Body */}
                  {isExpanded && (
                    <div className="p-4 bg-white animate-in slide-in-from-top-2 duration-200">
                      
                      {/* Matrix Table */}
                      <div className="overflow-x-auto pb-2">
                        <table className="w-full text-center border-collapse text-sm">
                          <thead>
                            <tr>
                              <th className="p-2 border-b-2 border-gray-100 bg-gray-50 text-left text-xs font-bold text-gray-500 w-20 sticky left-0 z-10 align-bottom">
                                Size \ Color
                              </th>
                              {colors.map(color => (
                                <th key={color} className="p-2 border-b-2 border-gray-100 text-xs font-bold text-gray-700 min-w-[100px] align-bottom">
                                  <div className="flex flex-col items-center gap-1.5 mb-1">
                                    <div className="w-16 h-16 rounded-md border border-gray-200 overflow-hidden bg-gray-50 shadow-sm">
                                      <img 
                                        src={colorImages[color] || 'https://placehold.co/400x400?text=No+Img'} 
                                        alt={color} 
                                        className="w-full h-full object-cover" 
                                      />
                                    </div>
                                    <span className="leading-tight px-1">{color}</span>
                                  </div>
                                </th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {sizes.map(size => (
                              <tr key={size} className="hover:bg-gray-50 transition-colors">
                                {/* Size Label (Row Header) */}
                                <td className="p-2 border-b border-gray-100 bg-gray-50 font-bold text-gray-700 sticky left-0 z-10 text-left shadow-[1px_0_2px_rgba(0,0,0,0.05)]">
                                  {size}
                                </td>
                                
                                {/* Stock Cells */}
                                {colors.map(color => {
                                  const product = items.find(i => i.color === color && i.size === size);
                                  const isSelected = selectedVariant?.sku === product?.sku;
                                  
                                  if (!product) {
                                    return (
                                      <td key={color} className="p-2 border-b border-gray-100 bg-gray-50/50">
                                        <span className="text-gray-300">-</span>
                                      </td>
                                    );
                                  }

                                  const isOutOfStock = product.stock <= 0;
                                  
                                  return (
                                    <td key={color} className="p-1 border-b border-gray-100">
                                      <button
                                        onClick={() => handleVariantClick(product)}
                                        className={`
                                          w-full py-3 rounded-md font-bold text-sm transition-all
                                          ${isSelected 
                                            ? 'bg-blue-600 text-white shadow-md transform scale-105' 
                                            : isOutOfStock 
                                              ? 'bg-red-50 text-red-500 hover:bg-red-100' 
                                              : 'bg-white text-gray-800 border border-gray-200 hover:border-blue-300 hover:text-blue-600'
                                          }
                                        `}
                                      >
                                        {product.stock}
                                      </button>
                                    </td>
                                  );
                                })}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                      
                      <div className="text-xs text-gray-400 mt-2 text-right">
                        * 数字をクリックして詳細を表示
                      </div>

                      {/* Detail Card Preview */}
                      {selectedVariant && (
                        <div className="mt-6 pt-4 border-t border-gray-100 animate-in fade-in zoom-in-95 duration-200">
                          <h4 className="text-xs font-bold text-gray-400 mb-2 uppercase">Selected Item Details</h4>
                          <ProductCard product={selectedVariant} />
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
