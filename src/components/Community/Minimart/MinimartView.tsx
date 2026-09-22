import React, { useState, useMemo } from 'react';
import { useApp } from '../../../context/AppContext';
import { MinimartProduct, MinimartCategory } from '../../../types';
import { CreateProductModal } from './CreateProductModal';
import { ProductDetailModal } from './ProductDetailModal';
import { ReportProductModal } from './ReportProductModal';
import {
  ShoppingBag,
  Search,
  Filter,
  Plus,
  Tag,
  MapPin,
  Clock,
  Phone,
  MessageCircle,
  ShieldCheck,
  Crown,
  Zap,
  Sparkles,
  DollarSign,
  ArrowUpDown,
  AlertCircle,
  Eye,
  CheckCircle2,
  Trash2,
  Edit3,
} from 'lucide-react';
import { TwitterVerifiedBadge, PremiumPackageBadge } from '../../ui/UserBadgeItem';
import { openExternalWhatsApp } from '../../../lib/whatsappUtils';

export const MinimartView: React.FC = () => {
  const {
    currentUser,
    role,
    minimartProducts,
    minimartCategories,
    minimartConfig,
    checkUserListingEligibility,
    deleteMinimartProduct,
    setActiveTab,
    openWalletModal,
  } = useApp();

  // Filters State
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [sortBy, setSortBy] = useState<'newest' | 'price_asc' | 'price_desc'>('newest');
  const [conditionFilter, setConditionFilter] = useState<string>('all');
  const [sellerTierFilter, setSellerTierFilter] = useState<'all' | 'vip' | 'premium' | 'free'>('all');
  const [viewMode, setViewMode] = useState<'all' | 'my_listings'>('all');

  // Modals
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<MinimartProduct | null>(null);
  const [editingProduct, setEditingProduct] = useState<MinimartProduct | null>(null);
  const [reportingProduct, setReportingProduct] = useState<MinimartProduct | null>(null);
  const [productToDelete, setProductToDelete] = useState<MinimartProduct | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const eligibility = checkUserListingEligibility();

  // Filter & Sort Products
  const filteredProducts = useMemo(() => {
    const now = Date.now();
    return minimartProducts.filter((product) => {
      // Exclude removed
      if (product.status === 'removed') return false;

      // If viewing "My Listings", include active, expired, and archived for this user
      if (viewMode === 'my_listings') {
        return (
          product.sellerId === currentUser.id ||
          (!!currentUser?.name && !!product.sellerName && currentUser.name.toLowerCase() === product.sellerName.toLowerCase())
        );
      }

      // In public discovery, only show active and non-expired listings
      if (product.status !== 'active') return false;
      if (product.expiresAt) {
        const exp = new Date(product.expiresAt).getTime();
        if (now >= exp) return false;
      }

      // Category filter
      if (selectedCategory !== 'all' && product.categoryId !== selectedCategory) {
        return false;
      }

      // Condition filter
      if (conditionFilter !== 'all' && product.condition !== conditionFilter) {
        return false;
      }

      // Seller Tier filter (VIP, Premium, Free)
      if (sellerTierFilter !== 'all') {
        const tier = (product.subscriptionPlan || (product as any).sellerTier || 'free').toLowerCase();
        if (sellerTierFilter === 'vip' && !tier.includes('vip') && !tier.includes('titan')) return false;
        if (sellerTierFilter === 'premium' && (tier.includes('vip') || tier.includes('free') || tier === 'basic')) return false;
        if (sellerTierFilter === 'free' && (!tier.includes('free') && tier !== 'basic')) return false;
      }

      // Search Query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesName = product.productName.toLowerCase().includes(q);
        const matchesDesc = product.description.toLowerCase().includes(q);
        const matchesSeller = (product.sellerName || '').toLowerCase().includes(q);
        const matchesLocation = ((product as any).locationCampus || product.location || '').toLowerCase().includes(q);
        const matchesTags = ((product as any).tags || []).some((t: string) => t.toLowerCase().includes(q));
        if (!matchesName && !matchesDesc && !matchesSeller && !matchesLocation && !matchesTags) {
          return false;
        }
      }

      return true;
    }).sort((a, b) => {
      if (sortBy === 'price_asc') return a.price - b.price;
      if (sortBy === 'price_desc') return b.price - a.price;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
  }, [minimartProducts, selectedCategory, searchQuery, sortBy, conditionFilter, sellerTierFilter, viewMode, currentUser.id, currentUser.name]);

  // Handle Delete Confirmation
  const handleConfirmDelete = async () => {
    if (!productToDelete) return;
    setIsDeleting(true);
    try {
      const targetId = productToDelete.id || productToDelete.productId;
      await deleteMinimartProduct(targetId);
      if (selectedProduct && (selectedProduct.id === targetId || selectedProduct.productId === targetId)) {
        setSelectedProduct(null);
      }
      setProductToDelete(null);
    } catch (err) {
      console.error('Failed to delete minimart product:', err);
    } finally {
      setIsDeleting(false);
    }
  };

  // Open WhatsApp Link directly (iOS Safari & PWA safe)
  const handleOpenWhatsApp = (e: React.MouseEvent, product: MinimartProduct) => {
    e.stopPropagation();
    const cleanPhone = (product.whatsappNumber || '').replace(/[^0-9]/g, '');
    const waPhone = cleanPhone.startsWith('0')
      ? `234${cleanPhone.slice(1)}`
      : cleanPhone.startsWith('234')
      ? cleanPhone
      : `234${cleanPhone}`;

    const messageText = encodeURIComponent(
      `Hello ${product.sellerName || 'Scholar'}, I saw your listing for "${product.productName}" (₦${product.price.toLocaleString()}) on Grobaax Minimart. Is it still available on campus?`
    );
    openExternalWhatsApp(`https://wa.me/${waPhone}?text=${messageText}`);
  };

  return (
    <div className="space-y-4">
      {/* Hero Header & User Sell Callout */}
      <div className="p-4 sm:p-5 rounded-3xl bg-gradient-to-r from-blue-950 via-blue-900 to-indigo-950 text-white border border-blue-800/40 shadow-xl relative overflow-hidden">
        <div className="absolute right-0 top-0 w-80 h-80 bg-radial from-amber-500/10 to-transparent rounded-full blur-2xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-black uppercase tracking-wider bg-amber-400 text-slate-950 flex items-center gap-1 shadow-xs">
                <ShoppingBag className="w-3 h-3" />
                <span>Grobaax Minimart</span>
              </span>
              <span className="text-xs text-blue-200 font-medium">Campus Student Discovery</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black tracking-tight text-white">
              List your skills, handouts, products Among fellow scholar
            </h2>
            <p className="text-xs text-blue-200/90 max-w-xl">
              Discover textbooks, gadgets, hostel appliances, and student services. Instant contact via WhatsApp — zero fees, zero middlemen.
            </p>
          </div>

          {/* Sell CTA & Tier Status */}
          <div className="flex flex-wrap items-center gap-2.5">
            <button
              onClick={() => setIsCreateOpen(true)}
              className="px-4 py-2.5 rounded-2xl text-xs font-black bg-gradient-to-r from-amber-400 via-amber-500 to-amber-600 text-slate-950 shadow-md shadow-amber-950/30 hover:scale-[1.02] active:scale-[0.98] transition cursor-pointer flex items-center gap-2"
            >
              <Plus className="w-4 h-4 stroke-[3]" />
              <span>List a Product</span>
            </button>

            {/* My Listings Toggle */}
            <button
              onClick={() => setViewMode(viewMode === 'all' ? 'my_listings' : 'all')}
              className={`px-3.5 py-2.5 rounded-2xl text-xs font-bold transition cursor-pointer flex items-center gap-1.5 border ${
                viewMode === 'my_listings'
                  ? 'bg-white text-blue-950 border-white shadow-md'
                  : 'bg-white/10 hover:bg-white/20 text-white border-white/10'
              }`}
            >
              <Tag className="w-3.5 h-3.5" />
              <span>{viewMode === 'my_listings' ? 'All Products' : 'My Listings'}</span>
            </button>
          </div>
        </div>

        {/* User Tier Status Bar */}
        <div className="mt-3 pt-3 border-t border-white/10 flex flex-wrap items-center justify-between gap-2 text-xs text-blue-200">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-slate-300 font-semibold">Your Seller Status:</span>
            {eligibility.userTier === 'free' ? (
              <div className="flex items-center gap-2 flex-wrap">
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30 flex items-center gap-1">
                  <span>🔒 Free Scholar (Listing Disabled)</span>
                </span>
                <span className="text-slate-300 text-xs hidden sm:inline">
                  Subscribe to Premium or VIP to list products.
                </span>
                <button
                  onClick={() => openWalletModal('upgrade')}
                  className="px-2.5 py-0.5 rounded-lg text-xs font-bold bg-amber-400 hover:bg-amber-300 text-slate-950 transition cursor-pointer flex items-center gap-1"
                >
                  <Zap className="w-3 h-3 fill-current" />
                  <span>Upgrade to Sell</span>
                </button>
              </div>
            ) : eligibility.userTier === 'vip' ? (
              <div className="flex items-center gap-2 flex-wrap">
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-black bg-gradient-to-r from-amber-400 to-amber-500 text-slate-950 flex items-center gap-1 shadow-xs">
                  <Crown className="w-3.5 h-3.5 fill-current" />
                  <span>VIP Scholar Seller</span>
                </span>
                <span className="text-amber-200 font-semibold text-xs">
                  {eligibility.remainingToday}/{eligibility.dailyLimit} listings left today • {eligibility.listingDurationHours}h live duration • Priority Ranking
                </span>
              </div>
            ) : (
              <div className="flex items-center gap-2 flex-wrap">
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-black bg-blue-500 text-white flex items-center gap-1">
                  <span>⭐ Premium Scholar Seller</span>
                </span>
                <span className="text-blue-100 font-semibold text-xs">
                  {eligibility.remainingToday}/{eligibility.dailyLimit} listings left today • {eligibility.listingDurationHours}h live duration
                </span>
                <button
                  onClick={() => openWalletModal('upgrade')}
                  className="text-amber-300 hover:text-amber-200 underline font-bold text-xs cursor-pointer ml-1"
                >
                  Upgrade to VIP for 48h listings
                </button>
              </div>
            )}
          </div>

          <div className="flex items-center gap-1.5 text-[11px] text-blue-200/80">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span>Direct WhatsApp • Zero Commission</span>
          </div>
        </div>
      </div>

      {/* Category Pills Filter */}
      <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar scrollbar-none py-1">
        <button
          onClick={() => setSelectedCategory('all')}
          className={`px-3.5 py-2 rounded-xl text-xs font-bold transition cursor-pointer shrink-0 whitespace-nowrap ${
            selectedCategory === 'all'
              ? 'bg-blue-900 text-white shadow-sm'
              : 'bg-slate-100 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
          }`}
        >
          All Items ({minimartProducts.filter(p => p.status === 'active').length})
        </button>

        {minimartCategories.map((cat) => {
          const count = minimartProducts.filter(p => p.categoryId === cat.id && p.status === 'active').length;
          return (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition cursor-pointer shrink-0 whitespace-nowrap flex items-center gap-1.5 ${
                selectedCategory === cat.id
                  ? 'bg-blue-900 text-white shadow-sm'
                  : 'bg-slate-100 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}
            >
              {cat.icon && <span>{cat.icon}</span>}
              <span>{cat.name}</span>
              <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                selectedCategory === cat.id ? 'bg-blue-800 text-blue-200' : 'bg-slate-200 dark:bg-slate-700 text-slate-500'
              }`}>
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Search & Sort Toolbar */}
      <div className="p-3 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-xs">
        {/* Search */}
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search textbooks, laptops, hostel gear..."
            className="w-full pl-9 pr-3.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 text-xs text-slate-900 dark:text-slate-100 placeholder:text-slate-400 border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-blue-600 focus:outline-hidden"
          />
        </div>

        {/* Filters and Sort */}
        <div className="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-end overflow-x-auto">
          {/* Seller Tier Filter (Free, Premium, VIP) */}
          <select
            value={sellerTierFilter}
            onChange={e => setSellerTierFilter(e.target.value as any)}
            className="px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-300 focus:ring-2 focus:ring-blue-600 focus:outline-hidden cursor-pointer"
          >
            <option value="all">All Sellers</option>
            <option value="vip">👑 VIP Scholars</option>
            <option value="premium">⭐ Premium Scholars</option>
            <option value="free">🎓 Free Scholars</option>
          </select>

          {/* Condition Filter */}
          <select
            value={conditionFilter}
            onChange={e => setConditionFilter(e.target.value)}
            className="px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-300 focus:ring-2 focus:ring-blue-600 focus:outline-hidden cursor-pointer"
          >
            <option value="all">All Conditions</option>
            <option value="Brand New">Brand New</option>
            <option value="Like New">Like New</option>
            <option value="Used - Good">Used - Good</option>
            <option value="Used - Fair">Used - Fair</option>
            <option value="Service">Campus Service</option>
          </select>

          {/* Sort */}
          <select
            value={sortBy}
            onChange={e => setSortBy(e.target.value as any)}
            className="px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-300 focus:ring-2 focus:ring-blue-600 focus:outline-hidden cursor-pointer"
          >
            <option value="newest">Newest Listings</option>
            <option value="price_asc">Price: Low to High</option>
            <option value="price_desc">Price: High to Low</option>
          </select>
        </div>
      </div>

      {/* Products Grid */}
      {filteredProducts.length === 0 ? (
        <div className="p-12 text-center bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 space-y-3">
          <div className="w-16 h-16 rounded-full bg-blue-50 dark:bg-blue-950/40 text-blue-900 dark:text-blue-400 flex items-center justify-center mx-auto">
            <ShoppingBag className="w-8 h-8" />
          </div>
          <h3 className="text-base font-black text-slate-900 dark:text-slate-100">
            {viewMode === 'my_listings'
              ? eligibility.userTier === 'free'
                ? 'Seller Subscription Required'
                : 'No Listings Yet'
              : 'No Products Found'}
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto">
            {viewMode === 'my_listings'
              ? eligibility.userTier === 'free'
                ? 'Free scholars cannot list items yet. Upgrade your subscription to Premium or VIP to start selling textbooks, gadgets, and student services on Minimart!'
                : `You haven't listed any items yet. You have ${eligibility.remainingToday} of ${eligibility.dailyLimit} listings available today!`
              : 'There are no active listings matching your current category or search query.'}
          </p>
          <button
            onClick={() => {
              if (selectedCategory !== 'all' || searchQuery || conditionFilter !== 'all') {
                setSelectedCategory('all');
                setSearchQuery('');
                setConditionFilter('all');
                setViewMode('all');
              } else if (viewMode === 'my_listings' && eligibility.userTier === 'free') {
                openWalletModal('upgrade');
              } else {
                setIsCreateOpen(true);
              }
            }}
            className="px-5 py-2.5 rounded-xl text-xs font-black bg-blue-900 hover:bg-blue-800 text-white transition cursor-pointer"
          >
            {selectedCategory !== 'all' || searchQuery || conditionFilter !== 'all'
              ? 'Clear Filters'
              : viewMode === 'my_listings' && eligibility.userTier === 'free'
              ? 'Upgrade to Start Selling'
              : 'List First Item'}
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3.5">
          {filteredProducts.map((product) => {
            const isOwner =
              currentUser.id === product.sellerId ||
              (!!currentUser?.name && !!product.sellerName && currentUser.name.toLowerCase() === product.sellerName.toLowerCase()) ||
              role === 'admin';
            const now = Date.now();
            const expTime = product.expiresAt ? new Date(product.expiresAt).getTime() : 0;
            const hoursLeft = Math.max(0, Math.round((expTime - now) / (1000 * 60 * 60)));
            const productImage =
              (product.imageUrls && product.imageUrls.length > 0 && product.imageUrls[0]) ||
              (product as any).images?.[0] ||
              'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=600&auto=format&fit=crop&q=80';

            return (
              <div
                key={product.id}
                onClick={() => setSelectedProduct(product)}
                className="group bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 hover:border-blue-500/50 hover:shadow-lg transition-all overflow-hidden flex flex-col cursor-pointer"
              >
                {/* Product Image */}
                <div className="relative h-44 w-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                  <img
                    src={productImage}
                    alt={product.productName}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    onError={(e) => {
                      (e.target as any).src = 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=600&auto=format&fit=crop&q=80';
                    }}
                  />

                  {/* Badges on Top of Image */}
                  <div className="absolute top-2.5 left-2.5 flex items-center gap-1.5 flex-wrap max-w-[70%]">
                    {product.condition && (
                      <span className="px-2 py-0.5 rounded-lg bg-slate-950/80 backdrop-blur-xs text-white text-[10px] font-bold border border-white/10">
                        {product.condition}
                      </span>
                    )}
                    <PremiumPackageBadge
                      tier={product.subscriptionPlan || (product as any).sellerTier || 'free'}
                      className="text-[9px] px-1.5 py-0.5 shadow-md"
                    />
                  </div>

                  {/* Category Pill */}
                  <span className="absolute top-2.5 right-2.5 px-2 py-0.5 rounded-lg bg-blue-900/90 backdrop-blur-xs text-white text-[10px] font-bold">
                    {product.categoryName || 'Item'}
                  </span>

                  {/* Expired Tag if in my listings */}
                  {product.status === 'expired' && (
                    <div className="absolute inset-0 bg-slate-950/70 flex items-center justify-center">
                      <span className="px-3 py-1 rounded-xl bg-slate-800 text-slate-200 text-xs font-black uppercase">
                        Listing Expired
                      </span>
                    </div>
                  )}
                </div>

                {/* Card Content */}
                <div className="p-3.5 flex-1 flex flex-col justify-between space-y-2.5">
                  <div>
                    {/* Price & Negotiable */}
                    <div className="flex items-center justify-between">
                      <div className="text-base font-black text-emerald-600 dark:text-emerald-400">
                        ₦{product.price.toLocaleString()}
                      </div>
                      {(product as any).isNegotiable ? (
                        <span className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded">
                          Negotiable
                        </span>
                      ) : (
                        <span className="text-[10px] text-slate-400 font-medium">
                          Fixed
                        </span>
                      )}
                    </div>

                    {/* Title */}
                    <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100 line-clamp-1 group-hover:text-blue-600 transition-colors mt-0.5">
                      {product.productName}
                    </h3>

                    {/* Location */}
                    <div className="flex items-center gap-1 text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                      <MapPin className="w-3 h-3 text-rose-500 shrink-0" />
                      <span className="truncate">{(product as any).locationCampus || product.location || 'Main Campus'}</span>
                    </div>
                  </div>

                  {/* Seller Details & Direct Action */}
                  <div className="pt-2 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between">
                    <div className="flex items-center gap-2 min-w-0">
                      <img
                        src={product.sellerProfileImage || (product as any).sellerAvatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80'}
                        alt={product.sellerName}
                        className="w-6 h-6 rounded-full object-cover shrink-0 border border-blue-900/30"
                      />
                      <div className="min-w-0 flex items-center gap-1">
                        <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300 truncate block">
                          {product.sellerName}
                        </span>
                        {(product as any).sellerVerified !== false && (
                          <TwitterVerifiedBadge className="w-3 h-3" />
                        )}
                        <PremiumPackageBadge
                          tier={product.subscriptionPlan || (product as any).sellerTier || 'free'}
                          className="text-[8px] px-1 py-0"
                        />
                      </div>
                    </div>

                    {/* Action Controls */}
                    <div className="flex items-center gap-1 shrink-0">
                      {isOwner && (
                        <>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setEditingProduct(product);
                            }}
                            title="Edit Listing"
                            className="p-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition cursor-pointer"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setProductToDelete(product);
                            }}
                            title="Delete Listing"
                            className="p-1.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 hover:bg-rose-600 hover:text-white transition cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </>
                      )}

                      {/* WhatsApp Button */}
                      <button
                        type="button"
                        onClick={(e) => handleOpenWhatsApp(e, product)}
                        title="Chat on WhatsApp"
                        className="p-1.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-600 hover:text-white transition cursor-pointer"
                      >
                        <MessageCircle className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modals */}
      <CreateProductModal
        isOpen={isCreateOpen || !!editingProduct}
        onClose={() => {
          setIsCreateOpen(false);
          setEditingProduct(null);
        }}
        initialProduct={editingProduct}
      />

      <ProductDetailModal
        isOpen={!!selectedProduct}
        onClose={() => setSelectedProduct(null)}
        product={selectedProduct}
        onEdit={(p) => setEditingProduct(p)}
        onReport={(p) => setReportingProduct(p)}
        onDelete={(p) => setProductToDelete(p)}
      />

      <ReportProductModal
        isOpen={!!reportingProduct}
        onClose={() => setReportingProduct(null)}
        product={reportingProduct}
      />

      {/* Custom Delete Confirmation Modal */}
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
                  This action will permanently remove this item from Grobaax Minimart.
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
                  {productToDelete.categoryName || 'Minimart item'}
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
                onClick={handleConfirmDelete}
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
                    <span>Delete Listing</span>
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
