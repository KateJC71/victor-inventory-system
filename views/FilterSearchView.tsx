import React, { useState, useMemo } from 'react';
import { Product, CATEGORIES, CategoryType } from '../types';
import { ProductCard } from '../components/ProductCard';
import { Filter, ChevronDown, Package, ChevronRight, ArrowLeft } from 'lucide-react';

interface FilterSearchViewProps {
  products: Product[];
}

const PRICE_RANGES = [
  { label: '全部', min: 0, max: Infinity },
  { label: '〜3,000円', min: 0, max: 3000 },
  { label: '3,000〜5,000円', min: 3000, max: 5000 },
  { label: '5,000〜10,000円', min: 5000, max: 10000 },
  { label: '10,000〜20,000円', min: 10000, max: 20000 },
  { label: '20,000円〜', min: 20000, max: Infinity },
];

export const FilterSearchView: React.FC<FilterSearchViewProps> = ({ products }) => {
  const [selectedCategory, setSelectedCategory] = useState<CategoryType | '全部'>('全部');
  const [selectedPriceRange, setSelectedPriceRange] = useState(0);
  const [selectedModel, setSelectedModel] = useState<string | null>(null);
  const [selectedColor, setSelectedColor] = useState<string | null>(null);
  const [selectedSku, setSelectedSku] = useState<string | null>(null);

  // Filter products based on category and price
  const filteredProducts = useMemo(() => {
    let result = products;

    if (selectedCategory !== '全部') {
      result = result.filter(p => p.category === selectedCategory);
    }

    const priceRange = PRICE_RANGES[selectedPriceRange];
    result = result.filter(p => p.price >= priceRange.min && p.price < priceRange.max);

    return result;
  }, [products, selectedCategory, selectedPriceRange]);

  // Group by Model Name
  const models = useMemo(() => {
    const groups: Record<string, { count: number, totalStock: number, image: string, category: string, minPrice: number }> = {};

    filteredProducts.forEach(p => {
      const modelName = p.modelName || p.sku;
      if (!groups[modelName]) {
        groups[modelName] = { count: 0, totalStock: 0, image: p.imageUrl, category: p.category, minPrice: p.price };
      }
      groups[modelName].count++;
      groups[modelName].totalStock += p.stock;
      if (p.price < groups[modelName].minPrice) {
        groups[modelName].minPrice = p.price;
      }
    });

    return Object.entries(groups)
      .map(([name, data]) => ({ name, ...data }))
      .sort((a, b) => a.minPrice - b.minPrice);
  }, [filteredProducts]);

  // Category counts
  const categoryCounts = useMemo(() => {
    const priceRange = PRICE_RANGES[selectedPriceRange];
    const priceFiltered = products.filter(p => p.price >= priceRange.min && p.price < priceRange.max);

    const counts: Record<string, number> = { '全部': priceFiltered.length };
    CATEGORIES.forEach(c => {
      counts[c] = priceFiltered.filter(p => p.category === c).length;
    });
    return counts;
  }, [products, selectedPriceRange]);

  // Products for selected model
  const modelProducts = useMemo(() => {
    if (!selectedModel) return [];
    return filteredProducts.filter(p => (p.modelName || p.sku) === selectedModel);
  }, [filteredProducts, selectedModel]);

  // Colors for selected model
  const colors = useMemo(() => {
    if (!selectedModel) return [];
    const groups: Record<string, { count: number, totalStock: number, image: string }> = {};

    modelProducts.forEach(p => {
      const color = p.color || 'デフォルト';
      if (!groups[color]) {
        groups[color] = { count: 0, totalStock: 0, image: p.imageUrl };
      }
      groups[color].count++;
      groups[color].totalStock += p.stock;
    });

    return Object.entries(groups).map(([name, data]) => ({ name, ...data }));
  }, [modelProducts, selectedModel]);

  // Check if model has color variants
  const hasColorVariants = useMemo(() => {
    const uniqueColors = new Set(modelProducts.map(p => p.color).filter(c => c && c.trim() !== ''));
    return uniqueColors.size > 1;
  }, [modelProducts]);

  // Products for selected color (or all if no color variants)
  const colorProducts = useMemo(() => {
    if (!selectedModel) return [];
    if (selectedColor) {
      return modelProducts.filter(p => (p.color || 'デフォルト') === selectedColor);
    }
    return modelProducts;
  }, [modelProducts, selectedColor, selectedModel]);

  // Check if this is a racket category
  const isRacket = useMemo(() => {
    if (modelProducts.length === 0) return false;
    return modelProducts[0].category === 'ラケット';
  }, [modelProducts]);

  // Handlers
  const handleSelectModel = (modelName: string) => {
    // Check if this model has only one SKU
    const modelSkus = filteredProducts.filter(p => (p.modelName || p.sku) === modelName);
    if (modelSkus.length === 1) {
      // Directly show the product detail
      setSelectedModel(modelName);
      setSelectedColor(null);
      setSelectedSku(modelSkus[0].sku);
    } else {
      setSelectedModel(modelName);
      setSelectedColor(null);
      setSelectedSku(null);
    }
  };

  const handleSelectColor = (colorName: string) => {
    // Check if this color has only one SKU
    const colorSkus = modelProducts.filter(p => (p.color || 'デフォルト') === colorName);
    if (colorSkus.length === 1) {
      setSelectedColor(colorName);
      setSelectedSku(colorSkus[0].sku);
    } else {
      setSelectedColor(colorName);
      setSelectedSku(null);
    }
  };

  const handleBack = () => {
    if (selectedColor) {
      setSelectedColor(null);
      setSelectedSku(null);
    } else if (selectedModel) {
      setSelectedModel(null);
      setSelectedColor(null);
      setSelectedSku(null);
    }
  };

  // Helper: Sort sizes
  const sortSizes = (sizes: string[]) => {
    const sizeOrder = ['XXS', 'XS', 'S', 'M', 'L', 'XL', 'XXL', '2XL', '3XL', '4XL'];
    return [...sizes].sort((a, b) => {
      const numA = parseFloat(a.replace(/[^0-9.]/g, ''));
      const numB = parseFloat(b.replace(/[^0-9.]/g, ''));
      if (!isNaN(numA) && !isNaN(numB) && numA !== numB) return numA - numB;
      const idxA = sizeOrder.indexOf(a.toUpperCase());
      const idxB = sizeOrder.indexOf(b.toUpperCase());
      if (idxA !== -1 && idxB !== -1) return idxA - idxB;
      if (idxA !== -1) return -1;
      if (idxB !== -1) return 1;
      return a.localeCompare(b);
    });
  };

  const selectedProduct = selectedSku ? products.find(p => p.sku === selectedSku) : null;

  // === Direct Product View (only 1 SKU) ===
  const isSingleSku = selectedModel && colorProducts.length === 1 && selectedSku;

  if (isSingleSku && selectedProduct) {
    return (
      <div className="p-4 max-w-7xl mx-auto">
        <button
          onClick={handleBack}
          className="mb-4 flex items-center gap-2 px-4 py-3 bg-stone-100 hover:bg-stone-200 rounded-lg text-stone-700 font-medium transition-colors w-full justify-center"
        >
          <ArrowLeft size={20} />
          {selectedColor ? 'カラー選択に戻る' : 'Model一覧に戻る'}
        </button>

        <ProductCard product={selectedProduct} />
      </div>
    );
  }

  // === LEVEL 3: Size/Spec Selection ===
  const showSizeView = selectedModel && (selectedColor || !hasColorVariants);

  if (showSizeView && colorProducts.length > 1) {
    const sizes = sortSizes(Array.from(new Set(colorProducts.map(p => p.size).filter(s => s && s.trim() !== ''))));
    const totalStock = colorProducts.reduce((sum, p) => sum + p.stock, 0);

    return (
      <div className="p-4 max-w-7xl mx-auto">
        <button
          onClick={handleBack}
          className="mb-4 flex items-center gap-2 px-4 py-3 bg-stone-100 hover:bg-stone-200 rounded-lg text-stone-700 font-medium transition-colors w-full justify-center"
        >
          <ArrowLeft size={20} />
          {selectedColor ? 'カラー選択に戻る' : 'Model一覧に戻る'}
        </button>

        <div className="flex items-center gap-4 mb-6 border-b border-stone-100 pb-4">
          {colorProducts[0] && (
            <div className="w-20 h-20 rounded-md overflow-hidden bg-stone-100 border border-stone-200 shadow-sm shrink-0">
              <img src={colorProducts[0].imageUrl} alt="preview" className="w-full h-full object-cover" />
            </div>
          )}
          <div>
            <div className="text-xs text-stone-400 mb-1">{selectedColor || selectedModel}</div>
            <h2 className="text-xl font-bold text-stone-900">{selectedModel}</h2>
            <div className="flex items-center gap-3 mt-1">
              <span className="text-xs bg-stone-100 text-stone-900 px-2 py-0.5 rounded-full">
                {colorProducts.length} SKU
              </span>
              <span className="text-xs bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full">
                在庫計: {totalStock}
              </span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-stone-200 overflow-hidden">
          <div className="p-4 bg-stone-50 border-b border-stone-200">
            <h3 className="font-bold text-stone-800 flex items-center gap-2">
              <Package size={18} className="text-stone-900" />
              {isRacket ? '規格別在庫' : 'サイズ別在庫'}
            </h3>
            <p className="text-xs text-stone-500 mt-1">クリックして詳細を表示</p>
          </div>

          {/* Racket: Weight + Grip */}
          {isRacket ? (
            <div className="p-4 grid grid-cols-2 sm:grid-cols-3 gap-3">
              {colorProducts.map(product => {
                const isOutOfStock = product.stock <= 0;
                const isLowStock = product.stock > 0 && product.stock < 5;
                const isSelected = selectedSku === product.sku;
                const spec = [product.weightClass, product.gripSize].filter(Boolean).join(' ') || product.sku;

                return (
                  <button
                    key={product.sku}
                    onClick={() => setSelectedSku(isSelected ? null : product.sku)}
                    className={`
                      p-4 rounded-lg border-2 transition-all text-center
                      ${isSelected
                        ? 'bg-stone-900 border-stone-200 text-white'
                        : isOutOfStock
                          ? 'bg-red-50 border-red-200 text-red-600'
                          : isLowStock
                            ? 'bg-orange-50 border-orange-200 text-orange-600 hover:border-orange-400'
                            : 'bg-white border-stone-200 hover:border-stone-200 hover:bg-stone-50'
                      }
                    `}
                  >
                    <div className="text-sm font-bold mb-1">{spec}</div>
                    <div className={`text-2xl font-bold ${isSelected ? 'text-white' : isOutOfStock ? 'text-red-500' : isLowStock ? 'text-orange-500' : 'text-emerald-700'}`}>
                      {product.stock}
                    </div>
                    <div className={`text-xs mt-1 ${isSelected ? 'text-stone-900' : 'text-stone-400'}`}>¥{product.price.toLocaleString()}</div>
                  </button>
                );
              })}
            </div>
          ) : (
            /* Standard Size Grid */
            <div className="p-4 grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2">
              {sizes.length > 0 ? sizes.map(size => {
                const product = colorProducts.find(p => p.size === size);
                if (!product) return null;
                const isOutOfStock = product.stock <= 0;
                const isLowStock = product.stock > 0 && product.stock < 5;
                const isSelected = selectedSku === product.sku;

                return (
                  <button
                    key={size}
                    onClick={() => setSelectedSku(isSelected ? null : product.sku)}
                    className={`
                      p-3 rounded-lg border-2 transition-all text-center
                      ${isSelected
                        ? 'bg-stone-900 border-stone-200 text-white'
                        : isOutOfStock
                          ? 'bg-red-50 border-red-200 text-red-600'
                          : isLowStock
                            ? 'bg-orange-50 border-orange-200 text-orange-600 hover:border-orange-400'
                            : 'bg-white border-stone-200 hover:border-stone-200 hover:bg-stone-50'
                      }
                    `}
                  >
                    <div className="text-sm font-bold mb-1">{size}</div>
                    <div className={`text-2xl font-bold ${isSelected ? 'text-white' : isOutOfStock ? 'text-red-500' : isLowStock ? 'text-orange-500' : 'text-emerald-700'}`}>
                      {product.stock}
                    </div>
                    <div className={`text-xs mt-1 ${isSelected ? 'text-stone-900' : 'text-stone-400'}`}>¥{product.price.toLocaleString()}</div>
                  </button>
                );
              }) : (
                colorProducts.map(product => {
                  const isOutOfStock = product.stock <= 0;
                  const isLowStock = product.stock > 0 && product.stock < 5;
                  const isSelected = selectedSku === product.sku;

                  return (
                    <button
                      key={product.sku}
                      onClick={() => setSelectedSku(isSelected ? null : product.sku)}
                      className={`
                        p-3 rounded-lg border-2 transition-all text-center
                        ${isSelected
                          ? 'bg-stone-900 border-stone-200 text-white'
                          : isOutOfStock
                            ? 'bg-red-50 border-red-200 text-red-600'
                            : isLowStock
                              ? 'bg-orange-50 border-orange-200 text-orange-600 hover:border-orange-400'
                              : 'bg-white border-stone-200 hover:border-stone-200 hover:bg-stone-50'
                        }
                      `}
                    >
                      <div className="text-xs font-mono mb-1 truncate">{product.sku}</div>
                      <div className={`text-2xl font-bold ${isSelected ? 'text-white' : isOutOfStock ? 'text-red-500' : isLowStock ? 'text-orange-500' : 'text-emerald-700'}`}>
                        {product.stock}
                      </div>
                      <div className={`text-xs mt-1 ${isSelected ? 'text-stone-900' : 'text-stone-400'}`}>¥{product.price.toLocaleString()}</div>
                    </button>
                  );
                })
              )}
            </div>
          )}
        </div>

        {selectedProduct && (
          <div className="mt-6">
            <h4 className="text-sm font-bold text-stone-500 mb-3">選択中のSKU詳細</h4>
            <ProductCard product={selectedProduct} />
          </div>
        )}
      </div>
    );
  }

  // === LEVEL 2: Color Selection ===
  if (selectedModel && hasColorVariants) {
    return (
      <div className="p-4 max-w-7xl mx-auto">
        <button
          onClick={handleBack}
          className="mb-4 flex items-center gap-2 px-4 py-3 bg-stone-100 hover:bg-stone-200 rounded-lg text-stone-700 font-medium transition-colors w-full justify-center"
        >
          <ArrowLeft size={20} />
          Model一覧に戻る
        </button>

        <div className="mb-6">
          <h2 className="text-xl font-bold text-stone-900">{selectedModel}</h2>
          <p className="text-sm text-stone-500 mt-1">カラーを選択してください</p>
        </div>

        <div className="grid grid-cols-2 gap-3">
          {colors.map((color) => {
            const isOutOfStock = color.totalStock <= 0;
            const isLowStock = color.totalStock > 0 && color.totalStock < 10;

            return (
              <button
                key={color.name}
                onClick={() => handleSelectColor(color.name)}
                className="flex flex-col bg-white rounded-xl shadow-sm border border-stone-200 active:scale-[0.98] transition-all overflow-hidden hover:border-stone-200"
              >
                <div className="h-32 w-full bg-stone-100 relative">
                  <img src={color.image} alt={color.name} className="w-full h-full object-cover" />
                  <div className="absolute top-2 right-2 bg-black/60 text-white text-[10px] px-1.5 py-0.5 rounded-full">
                    {color.count} サイズ
                  </div>
                </div>
                <div className="p-3 flex items-center justify-between w-full">
                  <span className="font-medium text-stone-800 text-sm">{color.name}</span>
                  <div className={`text-sm font-bold ${isOutOfStock ? 'text-red-500' : isLowStock ? 'text-orange-500' : 'text-emerald-700'}`}>
                    在庫: {color.totalStock}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  // === LEVEL 1: Filter + Model List ===
  return (
    <div className="p-4 max-w-3xl mx-auto">
      <h2 className="text-lg font-bold text-stone-900 mb-4 px-1 flex items-center gap-2">
        <Filter size={20} className="text-stone-900" />
        条件検索
      </h2>

      {/* Filter Controls */}
      <div className="bg-white rounded-xl shadow-sm border border-stone-200 p-4 mb-4">
        {/* Category Filter */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-stone-700 mb-2">カテゴリー</label>
          <div className="relative">
            <select
              value={selectedCategory}
              onChange={(e) => {
                setSelectedCategory(e.target.value as CategoryType | '全部');
                setSelectedModel(null);
                setSelectedColor(null);
                setSelectedSku(null);
              }}
              className="w-full p-3 pr-10 border border-stone-300 rounded-lg appearance-none bg-white text-stone-800 font-medium focus:outline-none focus:ring-2 focus:ring-stone-900 focus:border-transparent"
            >
              <option value="全部">全部 ({categoryCounts['全部']})</option>
              {CATEGORIES.map(category => (
                <option key={category} value={category}>
                  {category} ({categoryCounts[category]})
                </option>
              ))}
            </select>
            <ChevronDown size={20} className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 pointer-events-none" />
          </div>
        </div>

        {/* Price Range Filter */}
        <div>
          <label className="block text-sm font-medium text-stone-700 mb-2">価格帯（税抜）</label>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {PRICE_RANGES.map((range, idx) => (
              <button
                key={idx}
                onClick={() => {
                  setSelectedPriceRange(idx);
                  setSelectedModel(null);
                  setSelectedColor(null);
                  setSelectedSku(null);
                }}
                className={`
                  p-2 rounded-lg text-sm font-medium transition-all border-2
                  ${selectedPriceRange === idx
                    ? 'bg-stone-900 border-stone-200 text-white'
                    : 'bg-white border-stone-200 text-stone-700 hover:border-stone-200'
                  }
                `}
              >
                {range.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Results Count */}
      <div className="flex items-center justify-between mb-3 px-1">
        <div className="flex items-center gap-2 text-sm text-stone-600">
          <Package size={16} />
          <span>検索結果: <strong className="text-stone-900">{models.length}</strong> モデル</span>
        </div>
        {models.length > 0 && (
          <span className="text-xs text-stone-400">価格順</span>
        )}
      </div>

      {/* Model List */}
      {models.length > 0 ? (
        <div className="grid grid-cols-1 gap-3">
          {models.map((model) => {
            const isOutOfStock = model.totalStock <= 0;
            const isLowStock = model.totalStock > 0 && model.totalStock < 10;

            return (
              <button
                key={model.name}
                onClick={() => handleSelectModel(model.name)}
                className="flex items-center p-3 bg-white rounded-xl shadow-sm border border-stone-200 active:scale-[0.98] transition-transform text-left hover:border-stone-200 group"
              >
                <div className="w-16 h-16 rounded-md bg-stone-100 overflow-hidden shrink-0 border border-stone-100">
                  {model.image && <img src={model.image} alt={model.name} className="w-full h-full object-cover" />}
                </div>
                <div className="ml-4 flex-1 min-w-0">
                  <div className="text-[10px] text-stone-400 mb-0.5">{model.category}</div>
                  <h3 className="font-bold text-stone-900 group-hover:text-stone-900 transition-colors truncate">{model.name}</h3>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-xs text-stone-500">¥{model.minPrice.toLocaleString()}〜</span>
                    <span className={`text-xs font-bold ${isOutOfStock ? 'text-red-500' : isLowStock ? 'text-orange-500' : 'text-emerald-700'}`}>
                      在庫: {model.totalStock}
                    </span>
                  </div>
                </div>
                <ChevronRight className="text-stone-300 shrink-0" size={20} />
              </button>
            );
          })}
        </div>
      ) : (
        <div className="py-16 text-center text-stone-400 bg-white rounded-xl border border-dashed border-stone-300">
          <Package size={40} className="mx-auto mb-3 opacity-50" />
          <p>該当する商品がありません</p>
          <p className="text-sm mt-1">条件を変更してください</p>
        </div>
      )}
    </div>
  );
};
