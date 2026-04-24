import React from 'react';
import { Product } from '../types';
import { CategoryTag } from './CategoryTag';
import { StockPill } from './StockPill';

interface ProductCardProps {
  product: Product;
  variant?: 'row' | 'grid';  // row = mobile horizontal, grid = desktop vertical
}

export const ProductCard: React.FC<ProductCardProps> = ({ product, variant = 'row' }) => {
  const isOut = product.stock <= 0;
  const phLabel = product.sku.split(/[-\s]/)[0].slice(0, 7);

  // Build subtitle: color / size / weight / grip (non-empty, joined)
  const subParts = [product.color, product.size, product.weightClass, product.gripSize].filter(Boolean);
  const subtitle = subParts.length ? subParts.join(' / ') : product.gender || '';
  const seriesLine = product.subCategory || product.modelName || '';

  if (variant === 'grid') {
    return (
      <article className={`vi-card vi-card-hover p-4 ${isOut ? 'vi-card-out' : ''}`}>
        {product.imageUrl ? (
          <img src={product.imageUrl} alt={product.sku} className="w-full aspect-square object-cover rounded-xl mb-4" loading="lazy" />
        ) : (
          <div className="vi-ph w-full aspect-square mb-4">{phLabel}</div>
        )}
        <div className="flex items-center gap-2 mb-2">
          <CategoryTag category={product.category} />
          {subtitle && <span className="text-[13px] text-stone-500 font-semibold mono">{subtitle}</span>}
        </div>
        <div className="product-sku product-sku-mono truncate mb-0.5">{product.sku}</div>
        {seriesLine && <div className="product-meta">{seriesLine}</div>}
        <div className="flex items-end justify-between mt-4">
          <StockPill stock={product.stock} />
          <span className={`price-lg ${isOut ? 'price-out' : ''}`}>¥{product.price.toLocaleString()}</span>
        </div>
      </article>
    );
  }

  // 'row' variant — mobile horizontal card
  return (
    <article className={`vi-card vi-card-hover p-3 ${isOut ? 'vi-card-out' : ''}`}>
      <div className="flex gap-3.5">
        {product.imageUrl ? (
          <img src={product.imageUrl} alt={product.sku} className="w-[104px] h-[104px] object-cover rounded-xl flex-shrink-0" loading="lazy" />
        ) : (
          <div className="vi-ph w-[104px] h-[104px] flex-shrink-0">{phLabel}</div>
        )}
        <div className="flex-1 min-w-0 flex flex-col">
          <div className="flex items-center gap-2 mb-1.5 flex-wrap">
            <CategoryTag category={product.category} />
            {subtitle && <span className="text-[13px] text-stone-500 font-semibold mono">{subtitle}</span>}
          </div>
          <div className="product-sku product-sku-mono truncate">{product.sku}</div>
          {seriesLine && <div className="product-meta mt-0.5 truncate">{seriesLine}</div>}
          <div className="flex items-end justify-between mt-auto pt-2 gap-2">
            <StockPill stock={product.stock} />
            <span className={`price ${isOut ? 'price-out' : ''}`}>¥{product.price.toLocaleString()}</span>
          </div>
        </div>
      </div>
    </article>
  );
};
