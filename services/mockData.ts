
import { Product, CategoryType } from '../types';

export const INITIAL_PRODUCTS: Product[] = [
  // Rackets - A170JR Series
  {
    sku: 'A170JR-AR-180',
    name: 'Junior Racket A170 Red',
    modelName: 'A170JR',
    category: CategoryType.Racket,
    subCategory: 'オーラスピード',
    color: 'Red/White',
    size: '180g',
    price: 4500,
    stock: 12,
    imageUrl: 'https://images.unsplash.com/photo-1626245347247-66a7071db22b?auto=format&fit=crop&q=80&w=400'
  },
  {
    sku: 'A170JR-AR-190',
    name: 'Junior Racket A170 Red',
    modelName: 'A170JR',
    category: CategoryType.Racket,
    subCategory: 'オーラスピード',
    color: 'Red/White',
    size: '190g',
    price: 4500,
    stock: 5,
    imageUrl: 'https://images.unsplash.com/photo-1626245347247-66a7071db22b?auto=format&fit=crop&q=80&w=400'
  },
  {
    sku: 'A170JR-BL-180',
    name: 'Junior Racket A170 Blue',
    modelName: 'A170JR',
    category: CategoryType.Racket,
    subCategory: 'オーラスピード',
    color: 'Blue/White',
    size: '180g',
    price: 4500,
    stock: 8,
    imageUrl: 'https://images.unsplash.com/photo-1613907727404-b9b596fb63be?auto=format&fit=crop&q=80&w=400'
  },
  {
    sku: 'A170JR-BL-190',
    name: 'Junior Racket A170 Blue',
    modelName: 'A170JR',
    category: CategoryType.Racket,
    subCategory: 'オーラスピード',
    color: 'Blue/White',
    size: '190g',
    price: 4500,
    stock: 0,
    imageUrl: 'https://images.unsplash.com/photo-1613907727404-b9b596fb63be?auto=format&fit=crop&q=80&w=400'
  },

  // Rackets - TK-F Series
  {
    sku: 'TK-F-C-4U',
    name: 'Thruster K F C 4U',
    modelName: 'TK-F',
    category: CategoryType.Racket,
    subCategory: 'スラスター',
    color: 'Black/Gold',
    size: '4U',
    price: 21000,
    stock: 3,
    imageUrl: 'https://images.unsplash.com/photo-1622396172656-747d76f0c239?auto=format&fit=crop&q=80&w=400'
  },
  
  // Rackets - Other
  {
    sku: 'SQ-PRO-1',
    name: 'Pro Squash Racket X',
    modelName: 'SQ-PRO',
    category: CategoryType.Racket,
    subCategory: 'ドライブX',
    color: 'Yellow',
    size: '120g',
    price: 15000,
    stock: 2,
    imageUrl: 'https://images.unsplash.com/photo-1626245347247-66a7071db22b?auto=format&fit=crop&q=80&w=400'
  },

  // Shoes - SH-A920 Series
  {
    sku: 'SH-A920-C-250',
    name: 'Speed Shoe 920 Black',
    modelName: 'SH-A920',
    category: CategoryType.Shoes,
    subCategory: '成人',
    color: 'Black',
    size: '25.0cm',
    price: 12000,
    stock: 3,
    imageUrl: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&q=80&w=400'
  },
  {
    sku: 'SH-A920-C-260',
    name: 'Speed Shoe 920 Black',
    modelName: 'SH-A920',
    category: CategoryType.Shoes,
    subCategory: '成人',
    color: 'Black',
    size: '26.0cm',
    price: 12000,
    stock: 0,
    imageUrl: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&q=80&w=400'
  },
  {
    sku: 'SH-A920-D-255',
    name: 'Speed Shoe 920 Red',
    modelName: 'SH-A920',
    category: CategoryType.Shoes,
    subCategory: '成人',
    color: 'Red',
    size: '25.5cm',
    price: 12000,
    stock: 8,
    imageUrl: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&q=80&w=400'
  },

  // Apparel
  {
    sku: 'T-1234-M-M',
    name: 'Tournament Shirt 2024 Yellow',
    modelName: 'T-1234',
    category: CategoryType.Apparel,
    subCategory: 'Tシャツ',
    color: 'Neon Yellow',
    size: 'M',
    price: 3500,
    stock: 15,
    imageUrl: 'https://images.unsplash.com/photo-1529374255404-311a2a4f1fd9?auto=format&fit=crop&q=80&w=400'
  },
  {
    sku: 'T-1234-M-L',
    name: 'Tournament Shirt 2024 Yellow',
    modelName: 'T-1234',
    category: CategoryType.Apparel,
    subCategory: 'Tシャツ',
    color: 'Neon Yellow',
    size: 'L',
    price: 3500,
    stock: 50,
    imageUrl: 'https://images.unsplash.com/photo-1529374255404-311a2a4f1fd9?auto=format&fit=crop&q=80&w=400'
  },
  {
    sku: 'T-5678-F-S',
    name: 'Ladies Pro Skirt White',
    modelName: 'T-5678',
    category: CategoryType.Apparel,
    subCategory: 'ハーフパンツ',
    color: 'White',
    size: 'S',
    price: 4200,
    stock: 10,
    imageUrl: 'https://images.unsplash.com/photo-1574345229555-d36c116c478a?auto=format&fit=crop&q=80&w=400'
  },

  // Grips & Others
  {
    sku: 'GR-233-3P',
    name: 'Overgrip 3-Pack Mixed',
    modelName: 'GR-233',
    category: CategoryType.Grip,
    subCategory: 'グリップ',
    color: 'Mixed',
    size: 'One Size',
    price: 800,
    stock: 100,
    imageUrl: 'https://images.unsplash.com/photo-1627845348259-7104b7617639?auto=format&fit=crop&q=80&w=400'
  },
  {
    sku: 'C-7032',
    name: 'Master Ace Shuttles (Doz)',
    modelName: 'C-7032',
    category: CategoryType.Shuttle,
    subCategory: 'マスターエース',
    color: 'White',
    size: '3',
    price: 3800,
    stock: 200,
    imageUrl: 'https://images.unsplash.com/photo-1549646580-f04706be2728?auto=format&fit=crop&q=80&w=400'
  }
];