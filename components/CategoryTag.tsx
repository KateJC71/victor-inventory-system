import React from 'react';
import { CategoryType } from '../types';

const CLASS_MAP: Record<CategoryType, string> = {
  [CategoryType.Racket]:  'tag-racket',
  [CategoryType.Shoes]:   'tag-shoes',
  [CategoryType.Apparel]: 'tag-apparel',
  [CategoryType.Bag]:     'tag-bag',
  [CategoryType.Grip]:    'tag-grip',
  [CategoryType.String]:  'tag-string',
  [CategoryType.Shuttle]: 'tag-shuttle',
  [CategoryType.Others]:  'tag-other',
};

interface CategoryTagProps {
  category: CategoryType;
  className?: string;
}

export const CategoryTag: React.FC<CategoryTagProps> = ({ category, className = '' }) => {
  const cls = CLASS_MAP[category] ?? 'tag-other';
  return <span className={`tag ${cls} ${className}`}>{category}</span>;
};
