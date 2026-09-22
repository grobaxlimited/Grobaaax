import { MinimartCategory, MinimartProduct, MinimartConfig } from '../types';

export const DEFAULT_MINIMART_CONFIG: MinimartConfig = {
  premiumDailyListingLimit: 3,
  vipDailyListingLimit: 6,
  premiumListingDurationHours: 12,
  vipListingDurationHours: 12,
  enabled: true,
  minPriceNGN: 100,
  maxPriceNGN: 5000000,
  maxImagesPerListing: 4,
  limitsByTier: {
    free: { dailyListings: 0, listingDurationHours: 0 },
    premium: { dailyListings: 3, listingDurationHours: 12 },
    vip: { dailyListings: 6, listingDurationHours: 12 },
  },
};

export const INITIAL_MINIMART_CATEGORIES: MinimartCategory[] = [
  {
    id: 'cat_all',
    categoryId: 'all',
    name: 'All',
    description: 'All student products and services',
    status: 'active',
    displayOrder: 1,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'cat_fashion',
    categoryId: 'fashion',
    name: 'Fashion',
    description: 'Clothes, shoes, bags, hoodies, thrift & wear',
    status: 'active',
    displayOrder: 2,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'cat_electronics',
    categoryId: 'electronics',
    name: 'Electronics',
    description: 'Chargers, power banks, audio, smart devices',
    status: 'active',
    displayOrder: 3,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'cat_phones',
    categoryId: 'phones',
    name: 'Phones',
    description: 'Smartphones, cases, screen guards, mobile gear',
    status: 'active',
    displayOrder: 4,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'cat_computers',
    categoryId: 'computers',
    name: 'Computers',
    description: 'Laptops, mouse, keyboards, flash drives, parts',
    status: 'active',
    displayOrder: 5,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'cat_books',
    categoryId: 'books',
    name: 'Books',
    description: 'Course textbooks, past questions, revision guides',
    status: 'active',
    displayOrder: 6,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'cat_food',
    categoryId: 'food',
    name: 'Food',
    description: 'Campus snacks, meal packs, pastries, beverages',
    status: 'active',
    displayOrder: 7,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'cat_beauty',
    categoryId: 'beauty',
    name: 'Beauty',
    description: 'Skincare, perfumes, hair care, cosmetics',
    status: 'active',
    displayOrder: 8,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'cat_accessories',
    categoryId: 'accessories',
    name: 'Accessories',
    description: 'Watches, jewelry, sunglasses, backpacks, belts',
    status: 'active',
    displayOrder: 9,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'cat_school_items',
    categoryId: 'school_items',
    name: 'School Items',
    description: 'Calculators, lab coats, drawing boards, stationery',
    status: 'active',
    displayOrder: 10,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'cat_services',
    categoryId: 'services',
    name: 'Services',
    description: 'Graphic design, photography, tutoring, printing, repairs',
    status: 'active',
    displayOrder: 11,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'cat_other',
    categoryId: 'other',
    name: 'Other',
    description: 'General student items and misc products',
    status: 'active',
    displayOrder: 12,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

export const INITIAL_MINIMART_PRODUCTS: MinimartProduct[] = [];

export function isMockMinimartProduct(p: any): boolean {
  if (!p) return false;
  if (p.isMock) return true;
  const id = String(p.id || p.productId || '');
  if (id.startsWith('prod_seed_') || id.startsWith('seed_') || id.startsWith('mock_')) return true;
  if (
    p.sellerId === 'usr_02_kaito' ||
    p.sellerId === 'usr_01_kayode' ||
    p.sellerId === 'usr_03_elena' ||
    p.sellerId === 'usr_admin_barns'
  ) {
    return true;
  }
  return false;
}

