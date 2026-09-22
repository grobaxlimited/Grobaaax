import { Router, Request, Response } from 'express';
import { MinimartProduct, MinimartCategory, MinimartConfig, MinimartReport, UserListingEligibility } from '../src/types';
import { DEFAULT_MINIMART_CONFIG, INITIAL_MINIMART_CATEGORIES, INITIAL_MINIMART_PRODUCTS } from '../src/data/mockMinimartData';

export const minimartRouter = Router();

// In-memory runtime state for fast execution & server fallback
let currentConfig: MinimartConfig = { ...DEFAULT_MINIMART_CONFIG };
let categories: MinimartCategory[] = [...INITIAL_MINIMART_CATEGORIES];
let products: MinimartProduct[] = [...INITIAL_MINIMART_PRODUCTS];
let reports: MinimartReport[] = [];

// Helper to determine user tier - Strict & Accurate
function getUserTier(user: any): 'free' | 'premium' | 'vip' {
  if (!user) return 'free';
  if (user.role === 'admin' || user.role === 'super_admin' || user.isAdmin || user.isSuperAdmin) return 'vip';
  if (user.role === 'community_manager') return 'vip';

  // Check expiration first
  if (user.subscriptionExpiry) {
    try {
      const expTime = new Date(user.subscriptionExpiry).getTime();
      if (!isNaN(expTime) && expTime <= Date.now() && !user.isSuperAdmin && user.role !== 'admin') {
        return 'free';
      }
    } catch {
      // ignore
    }
  }

  const membership = (user.membershipTier || '').toLowerCase().trim();
  const subTier = (user.subscriptionTier || '').toLowerCase().trim();
  const plan = (user.subscriptionPlan || user.planId || user.subscriptionTier || user.membershipTier || user.tier || user.activePlanId || '').toLowerCase().trim();
  const planName = (user.planNameSnapshot || user.subscription?.name || user.subscription?.planId || '').toLowerCase().trim();

  const isExplicitlyFree =
    membership === 'free' ||
    membership === 'free scholar' ||
    membership === 'scholar (starter)' ||
    membership === 'starter scholar' ||
    subTier === 'free' ||
    subTier === 'free scholar' ||
    plan === 'free' ||
    plan === 'plan_free' ||
    plan === 'free_starter';

  if (
    user.isVip ||
    membership.includes('vip') ||
    membership.includes('titan') ||
    subTier.includes('vip') ||
    subTier.includes('titan') ||
    plan.includes('vip') ||
    plan.includes('titan') ||
    planName.includes('vip') ||
    planName.includes('titan') ||
    plan.includes('annual') ||
    planName.includes('annual')
  ) {
    return 'vip';
  }

  if (isExplicitlyFree && !user.isPremium) {
    return 'free';
  }

  const isPremiumCandidate = Boolean(
    user.isPremium ||
    (user.isSubscribed && !isExplicitlyFree) ||
    membership.includes('premium') ||
    membership.includes('pro') ||
    membership.includes('champion') ||
    subTier.includes('premium') ||
    subTier.includes('pro') ||
    subTier.includes('champion') ||
    plan.includes('premium') ||
    plan.includes('pro') ||
    plan.includes('basic_naira') ||
    planName.includes('premium') ||
    planName.includes('pro') ||
    planName.includes('basic monthly')
  );

  if (isPremiumCandidate) {
    if (!membership.includes('free') && !subTier.includes('free') && !plan.includes('free')) {
      return 'premium';
    }
  }

  return 'free';
}

// Calculate daily listing usage
function calculateUserListingEligibility(userId: string, userTier: 'free' | 'premium' | 'vip'): UserListingEligibility {
  if (userTier === 'free') {
    return {
      userId,
      todayCount: 0,
      dailyLimit: 0,
      remainingToday: 0,
      userTier: 'free',
      canCreateProduct: false,
      listingDurationHours: 0,
      reason: 'Selling on Grobaax Minimart is exclusive to Premium and VIP scholars.',
    };
  }

  const dailyLimit = userTier === 'vip' ? currentConfig.vipDailyListingLimit : currentConfig.premiumDailyListingLimit;
  const durationHours = userTier === 'vip' ? currentConfig.vipListingDurationHours : currentConfig.premiumListingDurationHours;

  // Check listings created within the last 24 hours
  const now = Date.now();
  const oneDayAgo = now - 24 * 60 * 60 * 1000;

  const todayListings = products.filter(p => {
    if (p.sellerId !== userId) return false;
    if (p.status === 'removed' || p.status === 'archived') return false;
    const createdTime = new Date(p.createdAt).getTime();
    return createdTime >= oneDayAgo;
  });

  const count = todayListings.length;
  const remaining = Math.max(0, dailyLimit - count);
  const canCreate = remaining > 0 && currentConfig.enabled;

  let reason = '';
  if (!currentConfig.enabled) {
    reason = 'Minimart listing is temporarily paused by platform administrators.';
  } else if (remaining <= 0) {
    reason = `Daily limit reached (${count}/${dailyLimit}). You can create another listing tomorrow.`;
  }

  return {
    userId,
    todayCount: count,
    dailyLimit,
    remainingToday: remaining,
    userTier,
    canCreateProduct: canCreate,
    listingDurationHours: durationHours,
    reason,
  };
}

// Clean up expired listings dynamically
function markExpiredListings() {
  const now = Date.now();
  products = products.map(p => {
    if (p.status === 'active') {
      const exp = new Date(p.expiresAt).getTime();
      if (now >= exp) {
        return { ...p, status: 'expired' };
      }
    }
    return p;
  });
}

// -------------------------------------------------------------
// 1. CONFIG ROUTES
// -------------------------------------------------------------

// GET /api/minimart/config
minimartRouter.get('/config', (_req: Request, res: Response) => {
  res.json({
    success: true,
    config: currentConfig,
  });
});

// POST /api/minimart/config (Admin)
minimartRouter.post('/config', (req: Request, res: Response) => {
  const updates = req.body || {};
  currentConfig = {
    ...currentConfig,
    ...updates,
    premiumDailyListingLimit: Number(updates.premiumDailyListingLimit ?? currentConfig.premiumDailyListingLimit),
    vipDailyListingLimit: Number(updates.vipDailyListingLimit ?? currentConfig.vipDailyListingLimit),
    premiumListingDurationHours: Number(updates.premiumListingDurationHours ?? currentConfig.premiumListingDurationHours),
    vipListingDurationHours: Number(updates.vipListingDurationHours ?? currentConfig.vipListingDurationHours),
    enabled: updates.enabled !== undefined ? Boolean(updates.enabled) : currentConfig.enabled,
  };

  res.json({
    success: true,
    message: 'Minimart configuration updated successfully.',
    config: currentConfig,
  });
});

// -------------------------------------------------------------
// 2. CATEGORIES ROUTES
// -------------------------------------------------------------

// GET /api/minimart/categories
minimartRouter.get('/categories', (_req: Request, res: Response) => {
  res.json({
    success: true,
    categories,
  });
});

// POST /api/minimart/categories (Admin Add / Edit)
minimartRouter.post('/categories', (req: Request, res: Response) => {
  const { id, categoryId, name, description, icon, status, displayOrder } = req.body || {};

  if (!name || !name.trim()) {
    return res.status(400).json({ success: false, error: 'Category name is required.' });
  }

  const existingIndex = categories.findIndex(c => c.id === id || c.categoryId === categoryId);

  if (existingIndex >= 0) {
    categories[existingIndex] = {
      ...categories[existingIndex],
      name: name.trim(),
      description: description || categories[existingIndex].description,
      icon: icon || categories[existingIndex].icon,
      status: status || categories[existingIndex].status,
      displayOrder: displayOrder ?? categories[existingIndex].displayOrder,
      updatedAt: new Date().toISOString(),
    };
    return res.json({ success: true, category: categories[existingIndex] });
  }

  const newCatId = categoryId || `cat_${Date.now()}`;
  const newCat: MinimartCategory = {
    id: id || newCatId,
    categoryId: newCatId,
    name: name.trim(),
    description: description || '',
    icon: icon || '',
    status: status || 'active',
    displayOrder: displayOrder ?? (categories.length + 1),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  categories.push(newCat);
  res.json({ success: true, category: newCat });
});

// DELETE /api/minimart/categories/:id
minimartRouter.delete('/categories/:id', (req: Request, res: Response) => {
  const { id } = req.params;
  categories = categories.filter(c => c.id !== id && c.categoryId !== id);
  res.json({ success: true, message: 'Category removed.' });
});

// -------------------------------------------------------------
// 3. ELIGIBILITY CHECK
// -------------------------------------------------------------

// GET /api/minimart/eligibility
minimartRouter.get('/eligibility', (req: Request, res: Response) => {
  const userId = (req.query.userId as string) || '';
  const role = (req.query.role as string) || '';
  const plan = (req.query.plan as string) || '';

  if (!userId) {
    return res.status(400).json({ success: false, error: 'Missing userId parameter.' });
  }

  const tier = getUserTier({ role, subscriptionPlan: plan, isPremium: req.query.isPremium === 'true', isVip: req.query.isVip === 'true' });
  const eligibility = calculateUserListingEligibility(userId, tier);

  res.json({
    success: true,
    eligibility,
  });
});

// -------------------------------------------------------------
// 4. PRODUCTS CRUD
// -------------------------------------------------------------

// GET /api/minimart/products
minimartRouter.get('/products', (req: Request, res: Response) => {
  markExpiredListings();

  const { category, condition, sellerId, search, status = 'active', includeExpired = 'false' } = req.query;

  let results = [...products];

  // Filter by status
  if (includeExpired === 'true') {
    results = results.filter(p => p.status !== 'removed' && p.status !== 'archived');
  } else if (status) {
    results = results.filter(p => p.status === status);
  }

  // Filter by seller
  if (sellerId) {
    results = results.filter(p => p.sellerId === sellerId);
  }

  // Filter by category
  if (category && category !== 'all') {
    results = results.filter(p => p.categoryId === category || p.categoryName.toLowerCase() === (category as string).toLowerCase());
  }

  // Filter by condition
  if (condition && condition !== 'all') {
    results = results.filter(p => p.condition.toLowerCase() === (condition as string).toLowerCase());
  }

  // Filter by search
  if (search) {
    const q = (search as string).toLowerCase().trim();
    results = results.filter(p =>
      p.productName.toLowerCase().includes(q) ||
      p.description.toLowerCase().includes(q) ||
      p.sellerName.toLowerCase().includes(q) ||
      p.institutionName.toLowerCase().includes(q) ||
      (p.location && p.location.toLowerCase().includes(q))
    );
  }

  // Sort by newest
  results.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  res.json({
    success: true,
    total: results.length,
    products: results,
  });
});

// POST /api/minimart/products (Create Product Listing with Authoritative Validation)
minimartRouter.post('/products', (req: Request, res: Response) => {
  if (!currentConfig.enabled) {
    return res.status(403).json({ success: false, error: 'Minimart is currently disabled by administrators.' });
  }

  const {
    sellerId,
    sellerName,
    sellerProfileImage,
    institutionId,
    institutionName,
    departmentName,
    productName,
    categoryId,
    categoryName,
    description,
    price,
    condition,
    imageUrls,
    whatsappNumber,
    location,
    additionalInfo,
    userRole,
    subscriptionPlan,
  } = req.body || {};

  if (!sellerId || !sellerName) {
    return res.status(400).json({ success: false, error: 'Authenticated seller credentials are required.' });
  }

  if (!productName || !productName.trim()) {
    return res.status(400).json({ success: false, error: 'Product name is required.' });
  }

  if (!price || isNaN(Number(price)) || Number(price) <= 0) {
    return res.status(400).json({ success: false, error: 'A valid price in Naira is required.' });
  }

  if (!whatsappNumber || !whatsappNumber.trim()) {
    return res.status(400).json({ success: false, error: 'A valid WhatsApp phone number is required.' });
  }

  // Clean WhatsApp number
  let sanitizedWhatsapp = whatsappNumber.replace(/[^\d+]/g, '');
  if (sanitizedWhatsapp.startsWith('0')) {
    sanitizedWhatsapp = '234' + sanitizedWhatsapp.slice(1);
  }
  if (!sanitizedWhatsapp.startsWith('+') && !sanitizedWhatsapp.startsWith('234')) {
    sanitizedWhatsapp = '234' + sanitizedWhatsapp;
  }
  if (!sanitizedWhatsapp.startsWith('+')) {
    sanitizedWhatsapp = '+' + sanitizedWhatsapp;
  }

  if (sanitizedWhatsapp.length < 11) {
    return res.status(400).json({ success: false, error: 'Invalid WhatsApp phone number format. Please provide a valid Nigerian line.' });
  }

  // Subscription verification
  const tier = getUserTier({ role: userRole, subscriptionPlan });
  const eligibility = calculateUserListingEligibility(sellerId, tier);

  if (!eligibility.canCreateProduct) {
    return res.status(403).json({
      success: false,
      error: eligibility.reason || 'Subscription restriction: Upgrade plan to publish product listings.',
      eligibility,
    });
  }

  const now = Date.now();
  const durationHours = eligibility.listingDurationHours || 12;
  const expiresAt = new Date(now + durationHours * 60 * 60 * 1000).toISOString();

  const newProduct: MinimartProduct = {
    id: `prod_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    productId: `prod_${Date.now()}`,
    sellerId,
    sellerName,
    sellerProfileImage: sellerProfileImage || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
    institutionId: institutionId || 'inst_unilag',
    institutionName: institutionName || 'Verified Scholar Institution',
    departmentName: departmentName || 'Department',
    productName: productName.trim(),
    categoryId: categoryId || 'other',
    categoryName: categoryName || 'Other',
    description: description ? description.trim() : '',
    price: Number(price),
    currency: 'NGN',
    condition: condition || 'New',
    imageUrls: Array.isArray(imageUrls) && imageUrls.length > 0 ? imageUrls : ['https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=600&auto=format&fit=crop&q=80'],
    whatsappNumber: sanitizedWhatsapp,
    location: location ? location.trim() : undefined,
    additionalInfo: additionalInfo ? additionalInfo.trim() : undefined,
    status: 'active',
    createdAt: new Date(now).toISOString(),
    updatedAt: new Date(now).toISOString(),
    expiresAt,
    subscriptionPlan: tier,
    listingDurationHours: durationHours,
    reportsCount: 0,
    viewsCount: 0,
  };

  products.unshift(newProduct);

  res.status(201).json({
    success: true,
    message: 'Product listed successfully on Minimart!',
    product: newProduct,
  });
});

// PUT /api/minimart/products/:id (Update product)
minimartRouter.put('/products/:id', (req: Request, res: Response) => {
  const { id } = req.params;
  const {
    userId,
    userRole,
    productName,
    categoryId,
    categoryName,
    description,
    price,
    condition,
    imageUrls,
    whatsappNumber,
    location,
    additionalInfo,
    status,
  } = req.body || {};

  const productIndex = products.findIndex(p => p.id === id || p.productId === id);
  if (productIndex < 0) {
    return res.status(404).json({ success: false, error: 'Product not found.' });
  }

  const existing = products[productIndex];

  // Check ownership
  const isOwner = existing.sellerId === userId;
  const isAdmin = userRole === 'admin';

  if (!isOwner && !isAdmin) {
    return res.status(403).json({ success: false, error: 'Unauthorized to modify this listing.' });
  }

  let sanitizedWhatsapp = existing.whatsappNumber;
  if (whatsappNumber) {
    let w = whatsappNumber.replace(/[^\d+]/g, '');
    if (w.startsWith('0')) w = '234' + w.slice(1);
    if (!w.startsWith('+') && !w.startsWith('234')) w = '234' + w;
    if (!w.startsWith('+')) w = '+' + w;
    sanitizedWhatsapp = w;
  }

  const updated: MinimartProduct = {
    ...existing,
    productName: productName ? productName.trim() : existing.productName,
    categoryId: categoryId || existing.categoryId,
    categoryName: categoryName || existing.categoryName,
    description: description !== undefined ? description.trim() : existing.description,
    price: price !== undefined && !isNaN(Number(price)) ? Number(price) : existing.price,
    condition: condition || existing.condition,
    imageUrls: Array.isArray(imageUrls) ? imageUrls : existing.imageUrls,
    whatsappNumber: sanitizedWhatsapp,
    location: location !== undefined ? location.trim() : existing.location,
    additionalInfo: additionalInfo !== undefined ? additionalInfo.trim() : existing.additionalInfo,
    status: status || existing.status,
    updatedAt: new Date().toISOString(),
  };

  products[productIndex] = updated;

  res.json({
    success: true,
    message: 'Product listing updated.',
    product: updated,
  });
});

// DELETE /api/minimart/products/:id (Remove product)
minimartRouter.delete('/products/:id', (req: Request, res: Response) => {
  const { id } = req.params;
  const userId = req.query.userId as string;
  const userRole = req.query.userRole as string;

  const productIndex = products.findIndex(p => p.id === id || p.productId === id);
  if (productIndex < 0) {
    return res.status(404).json({ success: false, error: 'Product not found.' });
  }

  const existing = products[productIndex];
  const isOwner = existing.sellerId === userId;
  const isAdmin = userRole === 'admin';

  if (!isOwner && !isAdmin) {
    return res.status(403).json({ success: false, error: 'Unauthorized to delete this listing.' });
  }

  // Purge product and associated reports from server memory
  products = products.filter(p => p.id !== id && p.productId !== id);
  reports = reports.filter(r => r.productId !== id);

  res.json({
    success: true,
    message: 'Product removed from Minimart.',
  });
});

// -------------------------------------------------------------
// 5. REPORTS
// -------------------------------------------------------------

// POST /api/minimart/products/:id/report
minimartRouter.post('/products/:id/report', (req: Request, res: Response) => {
  const { id } = req.params;
  const { reportedBy, reporterName, reason, description } = req.body || {};

  if (!reportedBy) {
    return res.status(400).json({ success: false, error: 'Reporter ID is required.' });
  }

  if (!reason) {
    return res.status(400).json({ success: false, error: 'Please select a reason for the report.' });
  }

  const product = products.find(p => p.id === id || p.productId === id);
  if (!product) {
    return res.status(404).json({ success: false, error: 'Product not found.' });
  }

  const report: MinimartReport = {
    id: `rep_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    reportId: `rep_${Date.now()}`,
    productId: product.id,
    productName: product.productName,
    sellerId: product.sellerId,
    sellerName: product.sellerName,
    reportedBy,
    reporterName: reporterName || 'Scholar Reporter',
    reason,
    description: description ? description.trim() : '',
    status: 'pending',
    createdAt: new Date().toISOString(),
  };

  reports.unshift(report);

  // Increment report count on product
  product.reportsCount = (product.reportsCount || 0) + 1;

  res.status(201).json({
    success: true,
    message: 'Thank you for helping keep the campus community safe. Your report has been submitted to moderators.',
    report,
  });
});

// GET /api/minimart/admin/reports
minimartRouter.get('/admin/reports', (_req: Request, res: Response) => {
  res.json({
    success: true,
    reports,
  });
});

// POST /api/minimart/admin/reports/:id/moderate
minimartRouter.post('/admin/reports/:id/moderate', (req: Request, res: Response) => {
  const { id } = req.params;
  const { action, adminNotes, adminId } = req.body || {}; // action: 'suspend_product' | 'dismiss' | 'resolve'

  const repIndex = reports.findIndex(r => r.id === id || r.reportId === id);
  if (repIndex < 0) {
    return res.status(404).json({ success: false, error: 'Report not found.' });
  }

  const report = reports[repIndex];
  report.status = action === 'dismiss' ? 'dismissed' : 'resolved';
  report.reviewedAt = new Date().toISOString();
  report.reviewedBy = adminId || 'Admin';
  report.adminNotes = adminNotes || '';

  if (action === 'suspend_product') {
    const prod = products.find(p => p.id === report.productId);
    if (prod) {
      prod.status = 'suspended';
      prod.updatedAt = new Date().toISOString();
    }
  }

  res.json({
    success: true,
    message: `Report ${action === 'dismiss' ? 'dismissed' : 'resolved'}.`,
    report,
  });
});

// POST /api/minimart/admin/moderate-product
minimartRouter.post('/admin/moderate-product', (req: Request, res: Response) => {
  const { productId, status } = req.body || {}; // status: 'active' | 'suspended' | 'removed'

  const prod = products.find(p => p.id === productId || p.productId === productId);
  if (!prod) {
    return res.status(404).json({ success: false, error: 'Product not found.' });
  }

  prod.status = status;
  prod.updatedAt = new Date().toISOString();

  res.json({
    success: true,
    message: `Product status updated to ${status}.`,
    product: prod,
  });
});
