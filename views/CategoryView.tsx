
import React, { useState, useMemo } from 'react';
import { Product, CATEGORIES, CategoryType } from '../types';
import { ProductCard } from '../components/ProductCard';
import { ChevronRight, ArrowLeft, Grid, Tag, Layers, Palette, Package } from 'lucide-react';

interface CategoryViewProps {
  products: Product[];
}

export const CategoryView: React.FC<CategoryViewProps> = ({ products }) => {
  const [selectedCategory, setSelectedCategory] = useState<CategoryType | null>(null);
  const [selectedSubCategory, setSelectedSubCategory] = useState<string | null>(null);
  const [selectedModel, setSelectedModel] = useState<string | null>(null);
  const [selectedColor, setSelectedColor] = useState<string | null>(null);
  const [selectedSku, setSelectedSku] = useState<string | null>(null);

  // --- Helpers for Data Aggregation ---

  // 1. Main Category Counts
  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    CATEGORIES.forEach(c => counts[c] = 0);
    products.forEach(p => {
      if (counts[p.category] !== undefined) {
        counts[p.category]++;
      }
    });
    return counts;
  }, [products]);

  // 2. SubCategories for selected Category
  const subCategories = useMemo(() => {
    if (!selectedCategory) return [];
    const categoryProducts = products.filter(p => p.category === selectedCategory);
    
    const subs = new Set<string>();
    const counts: Record<string, number> = {};
    
    categoryProducts.forEach(p => {
      const sub = p.subCategory && p.subCategory.trim() !== '' ? p.subCategory : 'General';
      subs.add(sub);
      counts[sub] = (counts[sub] || 0) + 1;
    });

    return Array.from(subs).sort().map(sub => ({
      name: sub,
      count: counts[sub]
    }));
  }, [selectedCategory, products]);

  // 3. Models for selected SubCategory
  const models = useMemo(() => {
    if (!selectedCategory || !selectedSubCategory) return [];
    const filtered = products.filter(p =>
      p.category === selectedCategory &&
      (p.subCategory === selectedSubCategory || (!p.subCategory && selectedSubCategory === 'General'))
    );

    const groups: Record<string, { count: number, image: string }> = {};
    filtered.forEach(p => {
      if (!groups[p.modelName]) {
        groups[p.modelName] = { count: 0, image: p.imageUrl };
      }
      groups[p.modelName].count++;
    });

    return Object.entries(groups).map(([name, data]) => ({
      name,
      ...data
    })).sort((a, b) => a.name.localeCompare(b.name));
  }, [selectedCategory, selectedSubCategory, products]);

  // Clear selected SKU when model or color changes
  const handleSelectModel = (modelName: string) => {
    // Check if this model has only one SKU
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
    // Check if this color has only one SKU
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

  // 4. Colors for selected Model (with total stock)
  const colors = useMemo(() => {
    if (!selectedCategory || !selectedSubCategory || !selectedModel) return [];
    const filtered = products.filter(p =>
      p.category === selectedCategory &&
      (p.subCategory === selectedSubCategory || (!p.subCategory && selectedSubCategory === 'General')) &&
      p.modelName === selectedModel
    );

    const groups: Record<string, { count: number, image: string, totalStock: number }> = {};
    filtered.forEach(p => {
      if (!groups[p.color]) {
        groups[p.color] = { count: 0, image: p.imageUrl, totalStock: 0 };
      }
      groups[p.color].count++;
      groups[p.color].totalStock += p.stock;
    });

    return Object.entries(groups).map(([name, data]) => ({
      name,
      ...data
    })).sort((a, b) => a.name.localeCompare(b.name));
  }, [selectedCategory, selectedSubCategory, selectedModel, products]);

  // 5. Final SKU List - for color selected OR for products without color (like rackets)
  const displayedProducts = useMemo(() => {
    if (!selectedCategory || !selectedSubCategory || !selectedModel) return [];

    let filtered = products.filter(p =>
      p.category === selectedCategory &&
      (p.subCategory === selectedSubCategory || (!p.subCategory && selectedSubCategory === 'General')) &&
      p.modelName === selectedModel
    );

    // If color is selected, filter by color
    if (selectedColor) {
      filtered = filtered.filter(p => p.color === selectedColor);
    }

    return filtered;
  }, [selectedCategory, selectedSubCategory, selectedModel, selectedColor, products]);

  // Check if this model has meaningful color variants
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

  // Helper: Sort sizes logically
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

  // --- Render Views ---

  // Direct Product View (only 1 SKU in model)
  const isSingleSku = selectedModel && displayedProducts.length === 1 && selectedSku;
  const singleProduct = isSingleSku ? products.find(p => p.sku === selectedSku) : null;

  if (isSingleSku && singleProduct) {
    return (
      <div className="p-4 max-w-7xl mx-auto">
        <button
          onClick={() => {
            setSelectedModel(null);
            setSelectedColor(null);
            setSelectedSku(null);
          }}
          className="mb-4 flex items-center gap-2 px-4 py-3 bg-stone-100 hover:bg-stone-200 rounded-lg text-stone-700 font-medium transition-colors w-full justify-center"
        >
          <ArrowLeft size={20} />
          Model選択に戻る
        </button>

        <ProductCard product={singleProduct} />
      </div>
    );
  }

  // LEVEL 5: Matrix View - after selecting color OR for items without color variants (rackets)
  // Show matrix when: color is selected, OR model is selected but no color variants exist
  const showMatrix = selectedCategory && selectedSubCategory && selectedModel && (selectedColor || !hasColorVariants);

  if (showMatrix && displayedProducts.length > 1) {
    // For rackets: use weightClass x gripSize matrix
    // For others: use size list
    const isRacket = selectedCategory === 'ラケット';

    const sizes = sortSizes(Array.from(new Set(displayedProducts.map(p => p.size).filter(s => s && s.trim() !== ''))));
    const weightClasses = Array.from(new Set(displayedProducts.map(p => p.weightClass).filter(w => w && w.trim() !== ''))).sort();
    const gripSizes = Array.from(new Set(displayedProducts.map(p => p.gripSize).filter(g => g && g.trim() !== ''))).sort();

    const totalStock = displayedProducts.reduce((sum, p) => sum + p.stock, 0);
    const selectedProduct = selectedSku ? products.find(p => p.sku === selectedSku) : null;

    // Determine back button behavior
    const handleBack = () => {
      if (selectedColor) {
        setSelectedColor(null);
      } else {
        setSelectedModel(null);
      }
    };

    const backButtonText = selectedColor ? 'カラー選択に戻る' : 'Model選択に戻る';

    return (
      <div className="p-4 max-w-7xl mx-auto">
        <button
          onClick={handleBack}
          className="mb-4 flex items-center gap-2 px-4 py-3 bg-stone-100 hover:bg-stone-200 rounded-lg text-stone-700 font-medium transition-colors w-full justify-center"
        >
          <ArrowLeft size={20} />
          {backButtonText}
        </button>

        <div className="flex items-center gap-4 mb-6 border-b border-stone-100 pb-4">
           {displayedProducts[0] && (
             <div className="w-20 h-20 rounded-md overflow-hidden bg-stone-100 border border-stone-200 shadow-sm shrink-0">
               <img src={displayedProducts[0].imageUrl} alt="preview" className="w-full h-full object-cover" />
             </div>
           )}
           <div>
             <div className="flex items-center gap-2 text-xs text-stone-400 mb-1">
                <span>{selectedCategory}</span>
                <ChevronRight size={10} />
                <span>{selectedSubCategory}</span>
                <ChevronRight size={10} />
                <span>{selectedModel}</span>
                {selectedColor && (
                  <>
                    <ChevronRight size={10} />
                    <span>{selectedColor}</span>
                  </>
                )}
             </div>
             <h2 className="text-xl font-bold text-stone-900">{selectedColor || selectedModel}</h2>
             <div className="flex items-center gap-3 mt-1">
               <span className="text-xs bg-stone-100 text-stone-900 px-2 py-0.5 rounded-full">
                 {displayedProducts.length} SKU
               </span>
               <span className="text-xs bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full">
                 在庫計: {totalStock}
               </span>
             </div>
           </div>
        </div>

        {/* Matrix View - Different for Rackets vs Others */}
        <div className="vi-card overflow-hidden">
          <div className="p-4 bg-stone-50 border-b border-stone-200">
            <h3 className="font-bold text-stone-800 flex items-center gap-2">
              <Package size={18} className="text-stone-900" />
              {isRacket ? '規格別在庫' : 'サイズ別在庫'}
            </h3>
            <p className="text-xs text-stone-500 mt-1">クリックして詳細を表示</p>
          </div>

          {/* Racket: Weight + Grip combined (e.g., 3U G5, 4U G6) */}
          {isRacket ? (
            <div className="p-4 grid grid-cols-2 sm:grid-cols-3 gap-3">
              {displayedProducts.map(product => {
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
            /* Standard Size Grid for non-rackets */
            <div className="p-4 grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2">
              {sizes.length > 0 ? sizes.map(size => {
                const product = displayedProducts.find(p => p.size === size);
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
                /* Fallback: show all products as list */
                displayedProducts.map(product => {
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

        {/* Selected SKU Detail - Inline */}
        {selectedProduct && (
          <div className="mt-6">
            <h4 className="text-sm font-bold text-stone-500 mb-3">選択中のSKU詳細</h4>
            <ProductCard product={selectedProduct} />
          </div>
        )}

      </div>
    );
  }

  // LEVEL 4: Colors
  if (selectedCategory && selectedSubCategory && selectedModel) {
    return (
      <div className="p-4 max-w-7xl mx-auto">
        <button
          onClick={() => setSelectedModel(null)}
          className="mb-4 flex items-center gap-2 px-4 py-3 bg-stone-100 hover:bg-stone-200 rounded-lg text-stone-700 font-medium transition-colors w-full justify-center"
        >
          <ArrowLeft size={20} />
          Model選択に戻る
        </button>

        <div className="mb-6">
           <h2 className="text-xl font-bold text-stone-900 flex items-center gap-2">
             <Layers className="text-stone-900" size={24} />
             {selectedModel}
           </h2>
           <p className="text-sm text-stone-500 mt-1 ml-8">カラーを選択してください</p>
        </div>

        <div className="grid grid-cols-2 gap-3">
          {colors.map((color) => {
            const isOutOfStock = color.totalStock <= 0;
            const isLowStock = color.totalStock > 0 && color.totalStock < 10;

            return (
              <button
                key={color.name}
                onClick={() => handleSelectColor(color.name)}
                className="flex flex-col vi-card active:scale-[0.98] transition-all overflow-hidden hover:border-stone-200 group"
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

  // LEVEL 3: Models
  if (selectedCategory && selectedSubCategory) {
    return (
      <div className="p-4 max-w-7xl mx-auto">
        <button
          onClick={() => setSelectedSubCategory(null)}
          className="mb-4 flex items-center gap-2 px-4 py-3 bg-stone-100 hover:bg-stone-200 rounded-lg text-stone-700 font-medium transition-colors w-full justify-center"
        >
          <ArrowLeft size={20} />
          小分類選択に戻る
        </button>

        <div className="mb-6">
           <h2 className="text-xl font-bold text-stone-900 flex items-center gap-2">
             <Tag className="text-stone-900" size={24} />
             {selectedSubCategory}
           </h2>
           <p className="text-sm text-stone-500 mt-1 ml-8">Modelを選択してください</p>
        </div>

        <div className="grid grid-cols-1 gap-3">
          {models.length > 0 ? (
            models.map((model) => (
              <button
                key={model.name}
                onClick={() => handleSelectModel(model.name)}
                className="flex items-center p-3 vi-card active:scale-[0.98] transition-transform text-left hover:border-stone-200 group"
              >
                 <div className="w-16 h-16 rounded-md bg-stone-100 overflow-hidden shrink-0 border border-stone-100">
                    <img src={model.image} alt={model.name} className="w-full h-full object-cover" />
                 </div>
                 <div className="ml-4 flex-1">
                    <h3 className="font-bold text-stone-900 group-hover:text-stone-900 transition-colors">{model.name}</h3>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-xs bg-stone-100 text-stone-600 px-1.5 py-0.5 rounded">{model.count} items</span>
                    </div>
                 </div>
                 <ChevronRight className="text-stone-300" size={20} />
              </button>
            ))
          ) : (
             <div className="py-12 text-center text-stone-400 bg-white rounded-lg border border-dashed border-stone-300">
              このカテゴリにはModelが見つかりません
            </div>
          )}
        </div>
      </div>
    );
  }

  // LEVEL 2: SubCategories
  if (selectedCategory) {
    return (
       <div className="p-4 max-w-7xl mx-auto">
        <button
          onClick={() => setSelectedCategory(null)}
          className="mb-4 flex items-center gap-2 px-4 py-3 bg-stone-100 hover:bg-stone-200 rounded-lg text-stone-700 font-medium transition-colors w-full justify-center"
        >
          <ArrowLeft size={20} />
          カテゴリー選択に戻る
        </button>

        <div className="mb-6">
           <h2 className="text-xl font-bold text-stone-900 flex items-center gap-2">
             <div className="w-8 h-8 rounded-full bg-stone-100 flex items-center justify-center text-stone-900 text-sm">
                {selectedCategory.charAt(0)}
             </div>
             {selectedCategory}
           </h2>
           <p className="text-sm text-stone-500 ml-10 mt-1">小分類を選択してください</p>
        </div>

        <div className="grid grid-cols-2 gap-3">
          {subCategories.length > 0 ? (
            subCategories.map((sub) => (
              <button
                key={sub.name}
                onClick={() => setSelectedSubCategory(sub.name)}
                className="flex flex-col p-4 vi-card active:scale-[0.98] transition-transform text-left hover:border-stone-200 h-full"
              >
                <div className="flex justify-between items-start w-full mb-3">
                  <Tag className="text-stone-900" size={18} />
                  <span className="text-xs bg-stone-100 text-stone-600 px-1.5 py-0.5 rounded-md">{sub.count}</span>
                </div>
                <span className="font-medium text-stone-800 line-clamp-2">{sub.name}</span>
              </button>
            ))
          ) : (
            <div className="col-span-2 py-12 text-center text-stone-400 bg-white rounded-lg border border-dashed border-stone-300">
              このカテゴリにはサブカテゴリがありません
            </div>
          )}
        </div>
      </div>
    );
  }

  // LEVEL 1: Main Categories
  return (
    <div className="p-4 max-w-3xl mx-auto">
      <h2 className="text-lg font-bold text-stone-900 mb-4 px-1 flex items-center gap-2">
        <Grid size={20} className="text-stone-900"/>
        カテゴリー選択
      </h2>
      <div className="grid grid-cols-1 gap-3">
        {CATEGORIES.map(category => (
          <button
            key={category}
            onClick={() => setSelectedCategory(category)}
            className="flex items-center justify-between p-4 vi-card active:scale-[0.99] transition-transform hover:bg-stone-50"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-stone-50 flex items-center justify-center text-stone-900 font-bold text-lg">
                {category.charAt(0)}
              </div>
              <span className="font-medium text-stone-800 text-lg">{category}</span>
            </div>
            <div className="flex items-center gap-3">
               <span className="text-xs text-stone-400 font-medium">{categoryCounts[category]} items</span>
               <ChevronRight className="text-stone-300" size={20} />
            </div>
          </button>
        ))}
      </div>
    </div>
  );
};
