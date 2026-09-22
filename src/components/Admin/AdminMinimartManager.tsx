import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { MinimartProduct, MinimartCategory, MinimartConfig } from '../../types';
import { CreateProductModal } from '../Community/Minimart/CreateProductModal';
import { ProductDetailModal } from '../Community/Minimart/ProductDetailModal';
import {
  ShoppingBag,
  Plus,
  Edit3,
  Trash2,
  AlertTriangle,
  CheckCircle2,
  Clock,
  DollarSign,
  Search,
  Filter,
  ShieldAlert,
  ShieldCheck,
  Tag,
  Settings,
  Flame,
  Phone,
  MapPin,
  Eye,
  EyeOff,
  UserX,
  ExternalLink,
} from 'lucide-react';

export const AdminMinimartManager: React.FC = () => {
  const {
    currentUser,
    minimartProducts,
    minimartCategories,
    minimartConfig,
    minimartReports,
    updateMinimartConfig,
    addMinimartCategory,
    updateMinimartCategory,
    deleteMinimartCategory,
    updateMinimartProductStatus,
    deleteMinimartProduct,
    resolveMinimartReport,
  } = useApp();

  const [activeTab, setActiveTab] = useState<'products' | 'categories' | 'reports' | 'config'>('products');
  const [productFilter, setProductFilter] = useState<'all' | 'active' | 'reported' | 'suspended' | 'expired'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Modals state
  const [editingProduct, setEditingProduct] = useState<MinimartProduct | null>(null);
  const [previewProduct, setPreviewProduct] = useState<MinimartProduct | null>(null);
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<MinimartCategory | null>(null);
  const [productToDelete, setProductToDelete] = useState<MinimartProduct | null>(null);
  const [categoryToDelete, setCategoryToDelete] = useState<MinimartCategory | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Category Form
  const [catName, setCatName] = useState('');
  const [catSlug, setCatSlug] = useState('');
  const [catIcon, setCatIcon] = useState('📚');
  const [catDescription, setCatDescription] = useState('');

  // Config Form
  const [configForm, setConfigForm] = useState<MinimartConfig>(minimartConfig);
  const [configSavedToast, setConfigSavedToast] = useState(false);

  // Filtered Products
  const filteredProducts = minimartProducts.filter(p => {
    if (p.status === 'removed') return false;
    if (productFilter === 'active' && p.status !== 'active') return false;
    if (productFilter === 'suspended' && p.status !== 'suspended') return false;
    if (productFilter === 'expired' && p.status !== 'expired') return false;
    if (productFilter === 'reported') {
      const reports = minimartReports.filter(r => r.productId === p.id && r.status === 'pending');
      if (reports.length === 0) return false;
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        p.productName.toLowerCase().includes(q) ||
        (p.sellerName || '').toLowerCase().includes(q) ||
        (p.institutionName || p.location || '').toLowerCase().includes(q)
      );
    }
    return true;
  });

  const handleSaveConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    await updateMinimartConfig(configForm);
    setConfigSavedToast(true);
    setTimeout(() => setConfigSavedToast(false), 2000);
  };

  const handleOpenCategoryModal = (cat?: MinimartCategory) => {
    if (cat) {
      setEditingCategory(cat);
      setCatName(cat.name);
      setCatSlug(cat.categoryId || cat.id);
      setCatIcon(cat.icon || '📦');
      setCatDescription(cat.description || '');
    } else {
      setEditingCategory(null);
      setCatName('');
      setCatSlug('');
      setCatIcon('📚');
      setCatDescription('');
    }
    setIsCategoryModalOpen(true);
  };

  const handleSaveCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!catName.trim()) return;

    const slug = catSlug.trim() || catName.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    if (editingCategory) {
      await updateMinimartCategory(editingCategory.id, {
        name: catName.trim(),
        categoryId: slug,
        icon: catIcon.trim(),
        description: catDescription.trim(),
      });
    } else {
      await addMinimartCategory({
        name: catName.trim(),
        categoryId: slug,
        icon: catIcon.trim(),
        description: catDescription.trim(),
        status: 'active',
        displayOrder: minimartCategories.length + 1,
      });
    }

    setIsCategoryModalOpen(false);
  };

  return (
    <div className="space-y-4">
      {/* Top Navigation Subtabs */}
      <div className="flex items-center justify-between gap-3 bg-white dark:bg-slate-900 p-2 rounded-2xl border border-slate-200 dark:border-slate-800">
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
          <button
            onClick={() => setActiveTab('products')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
              activeTab === 'products'
                ? 'bg-blue-900 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <ShoppingBag className="w-3.5 h-3.5" />
            <span>Listings Moderation ({minimartProducts.filter(p => p.status !== 'removed').length})</span>
          </button>

          <button
            onClick={() => setActiveTab('categories')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
              activeTab === 'categories'
                ? 'bg-blue-900 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <Tag className="w-3.5 h-3.5" />
            <span>Categories ({minimartCategories.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('reports')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
              activeTab === 'reports'
                ? 'bg-blue-900 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <ShieldAlert className="w-3.5 h-3.5 text-rose-500" />
            <span>Reports ({minimartReports.filter(r => r.status === 'pending').length})</span>
          </button>

          <button
            onClick={() => setActiveTab('config')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
              activeTab === 'config'
                ? 'bg-blue-900 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <Settings className="w-3.5 h-3.5" />
            <span>Marketplace Limits & Durations</span>
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 1. PRODUCT LISTINGS MODERATION                                            */}
      {/* ========================================================================= */}
      {activeTab === 'products' && (
        <div className="space-y-4">
          {/* Controls Bar */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800">
            <div className="relative w-full sm:w-72">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search listings or sellers..."
                className="w-full pl-9 pr-3.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 text-xs text-slate-900 dark:text-slate-100 placeholder:text-slate-400 border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-blue-600"
              />
            </div>

            <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto">
              {(['all', 'active', 'reported', 'suspended', 'expired'] as const).map(filter => (
                <button
                  key={filter}
                  onClick={() => setProductFilter(filter)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold uppercase transition cursor-pointer whitespace-nowrap ${
                    productFilter === filter
                      ? 'bg-blue-900 text-white shadow-xs'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
                  }`}
                >
                  {filter}
                </button>
              ))}
            </div>
          </div>

          {/* Listings Table / Cards */}
          <div className="space-y-3">
            {filteredProducts.length === 0 ? (
              <div className="p-12 text-center bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 text-slate-400">
                <ShoppingBag className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                <p className="font-bold text-sm">No listings found in this filter view.</p>
              </div>
            ) : (
              filteredProducts.map(product => {
                const pendingReports = minimartReports.filter(
                  r => r.productId === product.id && r.status === 'pending'
                );

                return (
                  <div
                    key={product.id}
                    className={`p-4 rounded-2xl bg-white dark:bg-slate-900 border transition-all flex flex-col md:flex-row items-start md:items-center justify-between gap-4 ${
                      pendingReports.length > 0
                        ? 'border-rose-500/60 shadow-xs bg-rose-50/10'
                        : 'border-slate-200 dark:border-slate-800'
                    }`}
                  >
                    <div className="flex items-start gap-3.5 min-w-0">
                      <img
                        src={product.imageUrls?.[0] || 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=150&auto=format&fit=crop&q=80'}
                        alt={product.productName}
                        className="w-16 h-16 rounded-xl object-cover border border-slate-200 dark:border-slate-700 shrink-0"
                        onError={(e) => {
                          (e.target as any).src = 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=150&auto=format&fit=crop&q=80';
                        }}
                      />
                      <div className="space-y-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className="font-black text-sm text-slate-900 dark:text-slate-100 truncate">
                            {product.productName}
                          </h4>
                          <span className="font-black text-xs text-emerald-600 dark:text-emerald-400">
                            ₦{product.price.toLocaleString()}
                          </span>
                          <span className={`px-2 py-0.2 rounded text-[10px] font-black uppercase ${
                            product.status === 'active'
                              ? 'bg-emerald-500/10 text-emerald-600'
                              : product.status === 'suspended'
                              ? 'bg-rose-500/10 text-rose-600'
                              : 'bg-slate-200 dark:bg-slate-800 text-slate-500'
                          }`}>
                            {product.status}
                          </span>
                          {pendingReports.length > 0 && (
                            <span className="px-2 py-0.2 rounded text-[10px] font-black bg-rose-600 text-white flex items-center gap-1">
                              <AlertTriangle className="w-3 h-3" />
                              <span>{pendingReports.length} Flagged</span>
                            </span>
                          )}
                        </div>

                        <div className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-2 flex-wrap">
                          <span>Seller: <strong className="text-slate-700 dark:text-slate-300">{product.sellerName}</strong></span>
                          <span>•</span>
                          <span>{product.categoryName}</span>
                          <span>•</span>
                          <span>{product.institutionName || product.location || 'Campus'}</span>
                          <span>•</span>
                          <span>WhatsApp: {product.whatsappNumber}</span>
                        </div>
                      </div>
                    </div>

                    {/* Action Controls */}
                    <div className="flex items-center gap-2 self-end md:self-center shrink-0">
                      <button
                        onClick={() => setPreviewProduct(product)}
                        className="px-3 py-1.5 rounded-xl text-xs font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 transition cursor-pointer flex items-center gap-1"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>Preview</span>
                      </button>

                      {product.status === 'suspended' ? (
                        <button
                          onClick={() => updateMinimartProductStatus(product.id, 'active')}
                          className="px-3 py-1.5 rounded-xl text-xs font-bold bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500 hover:text-white transition cursor-pointer flex items-center gap-1"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>Unsuspend</span>
                        </button>
                      ) : (
                        <button
                          onClick={() => updateMinimartProductStatus(product.id, 'suspended')}
                          className="px-3 py-1.5 rounded-xl text-xs font-bold bg-rose-500/10 text-rose-600 hover:bg-rose-500 hover:text-white transition cursor-pointer flex items-center gap-1"
                        >
                          <EyeOff className="w-3.5 h-3.5" />
                          <span>Suspend</span>
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() => setEditingProduct(product)}
                        className="p-2 rounded-xl text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
                        title="Edit Listing"
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>

                      <button
                        type="button"
                        onClick={() => setProductToDelete(product)}
                        className="p-2 rounded-xl text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition cursor-pointer"
                        title="Delete Listing"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 2. CATEGORIES MANAGEMENT                                                  */}
      {/* ========================================================================= */}
      {activeTab === 'categories' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-3 bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800">
            <div>
              <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100">Product Categories</h3>
              <p className="text-xs text-slate-400">Configure marketplace taxonomy and navigation pills.</p>
            </div>
            <button
              onClick={() => handleOpenCategoryModal()}
              className="px-4 py-2 bg-blue-900 hover:bg-blue-800 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-md shadow-blue-950/20 transition"
            >
              <Plus className="w-4 h-4" />
              <span>Add Category</span>
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {minimartCategories.map(cat => {
              const productCount = minimartProducts.filter(p => p.categoryId === cat.id).length;
              return (
                <div
                  key={cat.id}
                  className="p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{cat.icon || '📦'}</span>
                    <div>
                      <h4 className="font-bold text-sm text-slate-900 dark:text-slate-100">{cat.name}</h4>
                      <p className="text-xs text-slate-400">{productCount} items listed</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleOpenCategoryModal(cat)}
                      className="p-1.5 text-slate-400 hover:text-blue-600 rounded-lg cursor-pointer"
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setCategoryToDelete(cat)}
                      className="p-1.5 text-slate-400 hover:text-rose-500 rounded-lg cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 3. SAFETY REPORTS MODERATION                                              */}
      {/* ========================================================================= */}
      {activeTab === 'reports' && (
        <div className="space-y-4">
          <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800">
            <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100">User Reports & Safety Flagged Items</h3>
            <p className="text-xs text-slate-400">Review suspicious or policy-violating products submitted by students.</p>
          </div>

          <div className="space-y-3">
            {minimartReports.length === 0 ? (
              <div className="p-12 text-center bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 text-slate-400">
                <ShieldCheck className="w-8 h-8 mx-auto mb-2 text-emerald-500" />
                <p className="font-bold text-sm">No safety reports pending review.</p>
              </div>
            ) : (
              minimartReports.map(report => {
                const targetProduct = minimartProducts.find(p => p.id === report.productId);

                return (
                  <div
                    key={report.id}
                    className="p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-3"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="px-2.5 py-0.5 rounded-md text-xs font-bold bg-rose-500/10 text-rose-600 border border-rose-500/20 uppercase">
                          {report.reason.replace(/_/g, ' ')}
                        </span>
                        <span className={`px-2 py-0.2 rounded text-[10px] uppercase font-bold ${
                          report.status === 'pending' ? 'bg-amber-400 text-slate-950' : 'bg-emerald-500/10 text-emerald-600'
                        }`}>
                          {report.status}
                        </span>
                      </div>
                      <span className="text-xs text-slate-400">
                        {new Date(report.createdAt).toLocaleString()}
                      </span>
                    </div>

                    <p className="text-xs text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-slate-800/40 p-3 rounded-xl border border-slate-200 dark:border-slate-800">
                      <strong>Report Note:</strong> {report.description || 'No additional description given.'}
                    </p>

                    {targetProduct && (
                      <div className="flex items-center justify-between p-3 bg-slate-100 dark:bg-slate-800 rounded-xl">
                        <div className="flex items-center gap-2 min-w-0">
                          <img
                            src={targetProduct.imageUrls?.[0] || 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=150&auto=format&fit=crop&q=80'}
                            alt={targetProduct.productName}
                            className="w-10 h-10 rounded-lg object-cover"
                          />
                          <div className="min-w-0">
                            <h5 className="font-bold text-xs text-slate-900 dark:text-slate-100 truncate">
                              {targetProduct.productName} (₦{targetProduct.price.toLocaleString()})
                            </h5>
                            <p className="text-[11px] text-slate-400">Seller: {targetProduct.sellerName}</p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => setPreviewProduct(targetProduct)}
                            className="px-3 py-1 rounded-lg text-xs font-bold bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 cursor-pointer"
                          >
                            Inspect
                          </button>
                          {report.status === 'pending' && (
                            <>
                              <button
                                onClick={async () => {
                                  await updateMinimartProductStatus(targetProduct.id, 'suspended');
                                  await resolveMinimartReport(report.id, 'dismissed');
                                }}
                                className="px-3 py-1 rounded-lg text-xs font-bold bg-amber-500 text-slate-950 hover:bg-amber-400 cursor-pointer"
                              >
                                Suspend
                              </button>
                              <button
                                onClick={async () => {
                                  if (window.confirm(`Permanently delete reported listing "${targetProduct.productName}"?`)) {
                                    await deleteMinimartProduct(targetProduct.id);
                                    await resolveMinimartReport(report.id, 'dismissed');
                                  }
                                }}
                                className="px-3 py-1 rounded-lg text-xs font-bold bg-rose-600 hover:bg-rose-500 text-white cursor-pointer"
                              >
                                Delete
                              </button>
                              <button
                                onClick={() => resolveMinimartReport(report.id, 'dismissed')}
                                className="px-3 py-1 rounded-lg text-xs font-bold bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 cursor-pointer"
                              >
                                Dismiss
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 4. CONFIGURATION, LIMITS & DURATIONS                                      */}
      {/* ========================================================================= */}
      {activeTab === 'config' && (
        <form onSubmit={handleSaveConfig} className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-6">
          <div>
            <h3 className="text-base font-black text-slate-900 dark:text-slate-100">
              Minimart Global Limits & Tier Durations
            </h3>
            <p className="text-xs text-slate-400">
              Configure daily publishing allowances and listing expiration hours for subscription tiers.
            </p>
          </div>

          {configSavedToast && (
            <div className="p-3 bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 rounded-xl text-xs text-emerald-700 dark:text-emerald-300 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
              <span>Minimart configuration successfully saved and synchronized!</span>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* VIP Scholar Limits */}
            <div className="p-5 rounded-2xl bg-amber-500/10 border border-amber-500/30 space-y-4">
              <div className="flex items-center gap-2">
                <span className="p-1.5 rounded-lg bg-amber-400 text-slate-950 font-black text-xs">VIP</span>
                <h4 className="font-black text-sm text-slate-900 dark:text-slate-100">VIP Scholar Tier</h4>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Daily Product Listings Quota
                </label>
                <input
                  type="number"
                  min="1"
                  max="50"
                  value={configForm.limitsByTier?.vip?.dailyListings ?? configForm.vipDailyListingLimit ?? 6}
                  onChange={e => {
                    const val = Number(e.target.value) || 6;
                    setConfigForm({
                      ...configForm,
                      vipDailyListingLimit: val,
                      limitsByTier: {
                        ...configForm.limitsByTier,
                        vip: {
                          listingDurationHours: configForm.limitsByTier?.vip?.listingDurationHours ?? configForm.vipListingDurationHours ?? 12,
                          dailyListings: val,
                        },
                        premium: configForm.limitsByTier?.premium ?? { dailyListings: 3, listingDurationHours: 12 },
                      }
                    });
                  }}
                  className="w-full p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-sm font-bold"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Active Listing Duration (Hours)
                </label>
                <input
                  type="number"
                  min="1"
                  max="168"
                  value={configForm.limitsByTier?.vip?.listingDurationHours ?? configForm.vipListingDurationHours ?? 12}
                  onChange={e => {
                    const val = Number(e.target.value) || 12;
                    setConfigForm({
                      ...configForm,
                      vipListingDurationHours: val,
                      limitsByTier: {
                        ...configForm.limitsByTier,
                        vip: {
                          dailyListings: configForm.limitsByTier?.vip?.dailyListings ?? configForm.vipDailyListingLimit ?? 6,
                          listingDurationHours: val,
                        },
                        premium: configForm.limitsByTier?.premium ?? { dailyListings: 3, listingDurationHours: 12 },
                      }
                    });
                  }}
                  className="w-full p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-sm font-bold"
                />
              </div>
            </div>

            {/* Premium Scholar Limits */}
            <div className="p-5 rounded-2xl bg-blue-500/10 border border-blue-500/30 space-y-4">
              <div className="flex items-center gap-2">
                <span className="p-1.5 rounded-lg bg-blue-600 text-white font-black text-xs">PREMIUM</span>
                <h4 className="font-black text-sm text-slate-900 dark:text-slate-100">Premium Scholar Tier</h4>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Daily Product Listings Quota
                </label>
                <input
                  type="number"
                  min="1"
                  max="50"
                  value={configForm.limitsByTier?.premium?.dailyListings ?? configForm.premiumDailyListingLimit ?? 3}
                  onChange={e => {
                    const val = Number(e.target.value) || 3;
                    setConfigForm({
                      ...configForm,
                      premiumDailyListingLimit: val,
                      limitsByTier: {
                        ...configForm.limitsByTier,
                        premium: {
                          listingDurationHours: configForm.limitsByTier?.premium?.listingDurationHours ?? configForm.premiumListingDurationHours ?? 12,
                          dailyListings: val,
                        },
                        vip: configForm.limitsByTier?.vip ?? { dailyListings: 6, listingDurationHours: 12 },
                      }
                    });
                  }}
                  className="w-full p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-sm font-bold"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Active Listing Duration (Hours)
                </label>
                <input
                  type="number"
                  min="1"
                  max="168"
                  value={configForm.limitsByTier?.premium?.listingDurationHours ?? configForm.premiumListingDurationHours ?? 12}
                  onChange={e => {
                    const val = Number(e.target.value) || 12;
                    setConfigForm({
                      ...configForm,
                      premiumListingDurationHours: val,
                      limitsByTier: {
                        ...configForm.limitsByTier,
                        premium: {
                          dailyListings: configForm.limitsByTier?.premium?.dailyListings ?? configForm.premiumDailyListingLimit ?? 3,
                          listingDurationHours: val,
                        },
                        vip: configForm.limitsByTier?.vip ?? { dailyListings: 6, listingDurationHours: 12 },
                      }
                    });
                  }}
                  className="w-full p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-sm font-bold"
                />
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-slate-200 dark:border-slate-800 flex justify-end">
            <button
              type="submit"
              className="px-6 py-2.5 bg-blue-900 hover:bg-blue-800 text-white font-bold text-xs rounded-xl shadow-lg shadow-blue-950/20 cursor-pointer"
            >
              Save Minimart Configuration
            </button>
          </div>
        </form>
      )}

      {/* Category Modal */}
      {isCategoryModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 w-full max-w-md space-y-4">
            <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
              {editingCategory ? 'Edit Category' : 'New Minimart Category'}
            </h3>

            <form onSubmit={handleSaveCategory} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Category Name
                </label>
                <input
                  type="text"
                  required
                  value={catName}
                  onChange={e => setCatName(e.target.value)}
                  placeholder="e.g., Electronics & Gadgets"
                  className="w-full p-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Emoji Icon
                  </label>
                  <input
                    type="text"
                    value={catIcon}
                    onChange={e => setCatIcon(e.target.value)}
                    placeholder="💻"
                    className="w-full p-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Slug ID
                  </label>
                  <input
                    type="text"
                    value={catSlug}
                    onChange={e => setCatSlug(e.target.value)}
                    placeholder="cat_electronics"
                    className="w-full p-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Description
                </label>
                <textarea
                  rows={2}
                  value={catDescription}
                  onChange={e => setCatDescription(e.target.value)}
                  placeholder="Brief description of items in this category"
                  className="w-full p-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs resize-none"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsCategoryModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-400"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-blue-900 hover:bg-blue-800 text-white rounded-xl text-xs font-bold"
                >
                  Save Category
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Product Detail Modal */}
      {previewProduct && (
        <ProductDetailModal
          isOpen={!!previewProduct}
          onClose={() => setPreviewProduct(null)}
          product={previewProduct}
          onEdit={p => setEditingProduct(p)}
          onDelete={p => setProductToDelete(p)}
        />
      )}

      {/* Edit Product Modal */}
      {editingProduct && (
        <CreateProductModal
          isOpen={!!editingProduct}
          onClose={() => setEditingProduct(null)}
          initialProduct={editingProduct}
        />
      )}

      {/* Delete Product Confirmation Modal */}
      {productToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden p-6 space-y-5">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-rose-500/10 text-rose-600 flex items-center justify-center shrink-0">
                <Trash2 className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-black text-slate-900 dark:text-slate-100">
                  Delete Listing?
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Are you sure you want to permanently remove this listing from Minimart?
                </p>
              </div>
            </div>

            <div className="p-3.5 bg-slate-50 dark:bg-slate-800/80 rounded-2xl border border-slate-200 dark:border-slate-700/60 flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-slate-200 dark:bg-slate-700 overflow-hidden shrink-0">
                <img
                  src={
                    (productToDelete.imageUrls && productToDelete.imageUrls[0]) ||
                    (productToDelete as any).images?.[0] ||
                    'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=200&auto=format&fit=crop&q=80'
                  }
                  alt={productToDelete.productName}
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate">
                  {productToDelete.productName}
                </div>
                <div className="text-xs font-black text-emerald-600 dark:text-emerald-400">
                  ₦{productToDelete.price?.toLocaleString()}
                </div>
                <div className="text-[10px] text-slate-400">
                  Seller: {productToDelete.sellerName}
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                disabled={isDeleting}
                onClick={() => setProductToDelete(null)}
                className="px-4 py-2.5 rounded-xl text-xs font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition cursor-pointer disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isDeleting}
                onClick={async () => {
                  setIsDeleting(true);
                  try {
                    await deleteMinimartProduct(productToDelete.id || productToDelete.productId);
                    if (previewProduct && (previewProduct.id === productToDelete.id || previewProduct.productId === productToDelete.id)) {
                      setPreviewProduct(null);
                    }
                    setProductToDelete(null);
                  } finally {
                    setIsDeleting(false);
                  }
                }}
                className="px-4 py-2.5 rounded-xl text-xs font-black bg-rose-600 hover:bg-rose-700 text-white shadow-md shadow-rose-950/20 transition cursor-pointer disabled:opacity-50 flex items-center gap-2"
              >
                {isDeleting ? (
                  <>
                    <span className="animate-spin w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full" />
                    <span>Deleting...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Delete Permanently</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Category Confirmation Modal */}
      {categoryToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden p-6 space-y-5">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-rose-500/10 text-rose-600 flex items-center justify-center shrink-0">
                <Trash2 className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-black text-slate-900 dark:text-slate-100">
                  Delete Category?
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Delete &ldquo;{categoryToDelete.name}&rdquo; category? Existing products in this category will become unassigned.
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                disabled={isDeleting}
                onClick={() => setCategoryToDelete(null)}
                className="px-4 py-2.5 rounded-xl text-xs font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition cursor-pointer disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isDeleting}
                onClick={async () => {
                  setIsDeleting(true);
                  try {
                    await deleteMinimartCategory(categoryToDelete.id || categoryToDelete.categoryId);
                    setCategoryToDelete(null);
                  } finally {
                    setIsDeleting(false);
                  }
                }}
                className="px-4 py-2.5 rounded-xl text-xs font-black bg-rose-600 hover:bg-rose-700 text-white shadow-md shadow-rose-950/20 transition cursor-pointer disabled:opacity-50 flex items-center gap-2"
              >
                {isDeleting ? (
                  <>
                    <span className="animate-spin w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full" />
                    <span>Deleting...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Delete Category</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
