import React from 'react';
import { Product } from '../types';
import { CategoryTag } from './CategoryTag';
import { StockPill } from './StockPill';

interface ProductCardProps {
  product: Product;
  /**
   * row    — mobile horizontal list row (small thumbnail left, info right)
   * grid   — vertical card for grid contexts (image top, info bottom)
   * detail — full product-detail card (2-col on desktop, stacked on mobile)
   */
  variant?: 'row' | 'grid' | 'detail';
  /** When supplied, row/grid cards become clickable (usually to open detail). */
  onClick?: (product: Product) => void;
}

export const ProductCard: React.FC<ProductCardProps> = ({ product, variant = 'row', onClick }) => {
  const isOut = product.stock <= 0;
  const phLabel = product.sku.split(/[-\s]/)[0].slice(0, 7);

  // Interaction props applied to the outer <article> when card is clickable
  const interactionProps = onClick
    ? {
        onClick: () => onClick(product),
        onKeyDown: (e: React.KeyboardEvent) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            onClick(product);
          }
        },
        role: 'button' as const,
        tabIndex: 0,
        'aria-label': `${product.sku} の詳細を表示`,
      }
    : {};

  // Short subtitle: color / size / weight / grip (for compact views)
  const subParts = [product.color, product.size, product.weightClass, product.gripSize].filter(Boolean);
  const subtitle = subParts.length ? subParts.join(' / ') : product.gender || '';
  const seriesLine = product.subCategory || product.modelName || '';

  // ─────────────────────────────────────────────────────────────
  // DETAIL variant — used when this is the single focus of the page
  // ─────────────────────────────────────────────────────────────
  if (variant === 'detail') {
    const attrs: Array<{ label: string; value: string }> = [];
    if (product.masterName && product.masterName !== product.modelName && product.masterName !== product.sku) {
      attrs.push({ label: 'マスター名', value: product.masterName });
    }
    if (product.gender) attrs.push({ label: '性別', value: product.gender });
    if (product.color) attrs.push({ label: 'カラー', value: product.color });
    if (product.size) attrs.push({ label: 'サイズ', value: product.size });
    if (product.weightClass) attrs.push({ label: '重量', value: product.weightClass });
    if (product.gripSize) attrs.push({ label: 'グリップ', value: product.gripSize });

    return (
      <article className={`vi-card overflow-hidden max-w-4xl mx-auto ${isOut ? 'vi-card-out' : ''}`}>
        <div className="grid md:grid-cols-2">
          {/* Image panel — always object-contain so tall racket photos show fully */}
          <div className="bg-stone-50 flex items-center justify-center p-6 md:p-10 border-b md:border-b-0 md:border-r border-stone-200 aspect-[4/5] md:aspect-auto md:min-h-[480px] relative">
            {product.imageUrl ? (
              <img
                src={product.imageUrl}
                alt={product.sku}
                className="max-w-full max-h-full object-contain"
                loading="eager"
              />
            ) : (
              <div className="vi-ph w-full h-full text-2xl">{phLabel}</div>
            )}
          </div>

          {/* Info panel */}
          <div className="p-6 md:p-8 flex flex-col">
            <div className="flex items-center gap-2 flex-wrap mb-3">
              <CategoryTag category={product.category} />
              {product.subCategory && (
                <span className="text-sm text-stone-500 font-semibold">{product.subCategory}</span>
              )}
            </div>

            <h2 className="product-sku product-sku-mono text-2xl md:text-[1.75rem] leading-tight break-all">
              {product.sku}
            </h2>
            {product.modelName && product.modelName !== product.sku && (
              <p className="mono text-sm text-stone-500 font-semibold mt-1">Model : {product.modelName}</p>
            )}

            <div className="flex items-end justify-between gap-4 py-4 border-t border-b border-stone-200 my-5">
              <StockPill stock={product.stock} />
              <span className={`price-lg text-[1.75rem] md:text-3xl ${isOut ? 'price-out' : ''}`}>
                ¥{product.price.toLocaleString()}
              </span>
            </div>

            {attrs.length > 0 && (
              <dl className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-3 text-[0.9375rem]">
                {attrs.map((a) => (
                  <React.Fragment key={a.label}>
                    <dt className="text-stone-500 font-semibold whitespace-nowrap">{a.label}</dt>
                    <dd className="text-stone-900 font-bold break-all">{a.value}</dd>
                  </React.Fragment>
                ))}
              </dl>
            )}
          </div>
        </div>
      </article>
    );
  }

  // ─────────────────────────────────────────────────────────────
  // GRID variant — vertical cards in multi-column list contexts
  // ─────────────────────────────────────────────────────────────
  if (variant === 'grid') {
    return (
      <article {...interactionProps} className={`vi-card vi-card-hover p-4 ${isOut ? 'vi-card-out' : ''}`}>
        {product.imageUrl ? (
          <div className="w-full aspect-square bg-stone-50 rounded-xl mb-4 flex items-center justify-center p-3 overflow-hidden">
            <img
              src={product.imageUrl}
              alt={product.sku}
              className="max-w-full max-h-full object-contain"
              loading="lazy"
            />
          </div>
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

  // ─────────────────────────────────────────────────────────────
  // ROW variant (default) — horizontal list row for mobile lists
  // ─────────────────────────────────────────────────────────────
  return (
    <article {...interactionProps} className={`vi-card vi-card-hover p-3 ${isOut ? 'vi-card-out' : ''}`}>
      <div className="flex gap-3.5">
        {product.imageUrl ? (
          <div className="w-[104px] h-[104px] bg-stone-50 rounded-xl flex-shrink-0 flex items-center justify-center p-1.5 overflow-hidden">
            <img
              src={product.imageUrl}
              alt={product.sku}
              className="max-w-full max-h-full object-contain"
              loading="lazy"
            />
          </div>
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
