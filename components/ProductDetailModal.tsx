import React, { useEffect } from 'react';
import { Product } from '../types';
import { ProductCard } from './ProductCard';
import { X } from 'lucide-react';

interface ProductDetailModalProps {
  product: Product | null;
  onClose: () => void;
}

export const ProductDetailModal: React.FC<ProductDetailModalProps> = ({ product, onClose }) => {
  // ESC to close + lock body scroll while open
  useEffect(() => {
    if (!product) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = originalOverflow;
    };
  }, [product, onClose]);

  if (!product) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-3 md:p-8" role="dialog" aria-modal="true" aria-label="商品詳細">
      {/* Backdrop */}
      <button
        onClick={onClose}
        aria-label="背景をクリックして閉じる"
        className="absolute inset-0 bg-stone-900/60 backdrop-blur-sm cursor-default"
      />

      {/* Dialog body */}
      <div className="relative z-10 w-full max-w-4xl max-h-[95vh] overflow-y-auto rounded-2xl shadow-2xl">
        <button
          onClick={onClose}
          aria-label="閉じる"
          className="absolute top-3 right-3 z-20 w-10 h-10 rounded-full bg-white shadow-md flex items-center justify-center text-stone-600 hover:text-stone-900 hover:bg-stone-100 border border-stone-200"
        >
          <X size={20} />
        </button>
        <ProductCard product={product} variant="detail" />
      </div>
    </div>
  );
};
