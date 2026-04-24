import React from 'react';

interface StockPillProps {
  stock: number;
  size?: 'normal' | 'sm';
  labelPrefix?: string; // e.g. "計" for MODEL matrix total
}

export const StockPill: React.FC<StockPillProps> = ({ stock, size = 'normal', labelPrefix }) => {
  const sizeClass = size === 'sm' ? 'pill-sm' : '';

  if (stock <= 0) {
    return <span className={`pill pill-red ${sizeClass}`}>在庫切れ</span>;
  }
  if (stock < 5) {
    const label = labelPrefix ? `${labelPrefix} ${stock}点` : `残り ${stock}点`;
    return <span className={`pill pill-orange ${sizeClass}`}>{label}</span>;
  }
  const label = labelPrefix ? `${labelPrefix} ${stock}点` : `在庫 ${stock}点`;
  return <span className={`pill pill-green ${sizeClass}`}>{label}</span>;
};

/**
 * A numeric cell version — just the number, colored by stock level.
 * Used inside MODEL matrix cells where header already conveys "count".
 */
export const StockPillCount: React.FC<{ stock: number }> = ({ stock }) => {
  if (stock <= 0) return <span className="text-stone-300 mono">—</span>;
  const cls = stock < 5 ? 'pill-orange' : 'pill-green';
  return <span className={`pill ${cls} pill-sm mono`}>{stock}</span>;
};
