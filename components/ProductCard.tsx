import React from 'react';
import { Product } from '../types';
import { Package, AlertCircle } from 'lucide-react';

interface ProductCardProps {
  product: Product;
  compact?: boolean;
}

export const ProductCard: React.FC<ProductCardProps> = ({ product, compact = false }) => {
  const isOutOfStock = product.stock <= 0;
  const isLowStock = product.stock > 0 && product.stock < 5;

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden w-full mb-4">
      {/* Product Image */}
      <div className="w-full h-56 bg-gray-50 relative">
        <img
          src={product.imageUrl}
          alt={product.name}
          className="w-full h-full object-contain"
        />
        {isOutOfStock && (
          <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
            <span className="text-white text-xs font-bold px-2 py-1 bg-red-600 rounded">SOLD OUT</span>
          </div>
        )}
      </div>

      {/* Product Details */}
      <div className="p-4">
        {/* Top Row: SKU (emphasized) + Stock */}
        <div className="flex justify-between items-start">
          <div>
            <div className="text-xs text-gray-500">商品SKU名：</div>
            <div className="text-lg font-bold text-gray-900 font-mono">{product.sku}</div>
          </div>
          <div className={`flex flex-col items-end ${isOutOfStock ? 'text-red-500' : isLowStock ? 'text-orange-500' : 'text-green-600'}`}>
            <div className="flex items-center gap-1">
              {isOutOfStock ? <AlertCircle size={14}/> : <Package size={14}/>}
              <span className="text-xs font-medium">在庫数</span>
            </div>
            <span className="text-2xl font-bold tracking-tight">{product.stock}</span>
          </div>
        </div>

        {/* Product Attributes */}
        <div className="mt-4 space-y-1.5 text-sm">
          <div className="flex items-center">
            <span className="text-gray-500 w-24">カテゴリー：</span>
            <span className="text-gray-800">{product.category}{product.subCategory ? ` / ${product.subCategory}` : ''}</span>
          </div>
          {product.gender && (
            <div className="flex items-center">
              <span className="text-gray-500 w-24">ジェンダー：</span>
              <span className="text-gray-800">{product.gender}</span>
            </div>
          )}
          <div className="flex items-center">
            <span className="text-gray-500 w-24">価格 (税抜)：</span>
            <span className="text-gray-800 font-bold">¥{product.price.toLocaleString()}</span>
          </div>
          {product.modelName && (
            <div className="flex items-center">
              <span className="text-gray-500 w-24">モデル名：</span>
              <span className="text-gray-800 font-medium">{product.modelName}</span>
            </div>
          )}
          {product.color && (
            <div className="flex items-center">
              <span className="text-gray-500 w-24">色：</span>
              <span className="text-gray-800">{product.color}</span>
            </div>
          )}
          {product.size && (
            <div className="flex items-center">
              <span className="text-gray-500 w-24">サイズ：</span>
              <span className="text-gray-800">{product.size}</span>
            </div>
          )}
          {product.weightClass && (
            <div className="flex items-center">
              <span className="text-gray-500 w-24">重量：</span>
              <span className="text-gray-800">{product.weightClass}</span>
            </div>
          )}
          {product.gripSize && (
            <div className="flex items-center">
              <span className="text-gray-500 w-24">グリップ：</span>
              <span className="text-gray-800">{product.gripSize}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
