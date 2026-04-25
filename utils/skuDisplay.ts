import { Product } from '../types';

/**
 * Tailwind class string for a stock-state button (used in matrix grids).
 * Selected state always wins (dark inversion). Otherwise traffic-light tint.
 */
export const stockBtnClass = (stock: number, selected: boolean) => {
  if (selected) return 'bg-stone-900 text-white border-stone-900';
  if (stock <= 0) return 'bg-red-50 text-red-700 border-red-200 hover:border-red-400';
  if (stock < 5)  return 'bg-orange-50 text-orange-700 border-orange-200 hover:border-orange-400';
  return 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:border-emerald-400';
};

/**
 * Pick the most informative label for a single SKU within a model group.
 * Looks at which attributes actually DIFFER across the group and uses those.
 * Falls back to the SKU suffix (everything after modelName) if nothing else.
 *
 * Examples:
 *   TK-F-C-ULTRAX (3U / 4U / 5U same color) → "3U", "4U", "5U"
 *   ARS-3100      (A / I / M / R same weight) → "A", "I", "M", "R"
 *   ARS-3100A4UG5 (only one) → falls back to suffix or full sku
 */
export const pickSkuLabel = (p: Product, group: Product[]): string => {
  const fields: Array<keyof Product> = ['weightClass', 'gripSize', 'size', 'color', 'gender'];
  const diffFields = fields.filter(f => {
    const values = new Set(group.map(it => String(it[f] ?? '').trim()).filter(Boolean));
    return values.size > 1;
  });
  if (diffFields.length > 0) {
    const parts = diffFields.map(f => String(p[f] ?? '').trim()).filter(Boolean);
    if (parts.length > 0) return parts.join(' ');
  }
  // Fallback: SKU minus the model prefix
  const suffix = (p.sku || '').replace(p.modelName || '', '').replace(/^[\s\-_]+/, '');
  return suffix || p.sku;
};
