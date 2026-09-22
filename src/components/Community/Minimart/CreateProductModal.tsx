import React, { useState, useRef } from 'react';
import { useApp } from '../../../context/AppContext';
import { MinimartProduct, MinimartCategory } from '../../../types';
import { compressProductImage } from '../../../utils/imageCompressor';
import {
  X,
  ShoppingBag,
  Tag,
  MapPin,
  Phone,
  Clock,
  Sparkles,
  AlertCircle,
  CheckCircle2,
  Crown,
  Zap,
  Image as ImageIcon,
  DollarSign,
  Upload,
  Camera,
  Trash2,
  RefreshCw,
  Loader2,
  FileImage,
} from 'lucide-react';

interface CreateProductModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialProduct?: MinimartProduct | null;
}

export const CreateProductModal: React.FC<CreateProductModalProps> = ({
  isOpen,
  onClose,
  initialProduct,
}) => {
  const {
    currentUser,
    minimartCategories,
    minimartConfig,
    addMinimartProduct,
    updateMinimartProduct,
    checkUserListingEligibility,
    setActiveTab,
    openWalletModal,
  } = useApp();

  const eligibility = checkUserListingEligibility();

  // Form State
  const [productName, setProductName] = useState(initialProduct?.productName || '');
  const [categoryId, setCategoryId] = useState(initialProduct?.categoryId || minimartCategories[0]?.id || 'cat_books');
  const [price, setPrice] = useState<string>(initialProduct ? String(initialProduct.price) : '');
  const [isNegotiable, setIsNegotiable] = useState<boolean>(initialProduct?.isNegotiable ?? true);
  const [condition, setCondition] = useState<MinimartProduct['condition']>(initialProduct?.condition || 'Used - Good');
  const [description, setDescription] = useState(initialProduct?.description || '');
  const [imageUrl, setImageUrl] = useState(
    initialProduct?.imageUrls?.[0] || initialProduct?.images?.[0] || ''
  );
  const [fileName, setFileName] = useState('');
  const [isCompressing, setIsCompressing] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [whatsappNumber, setWhatsappNumber] = useState(initialProduct?.whatsappNumber || (currentUser as any).phone || '+234');
  const [locationCampus, setLocationCampus] = useState(initialProduct?.locationCampus || `${currentUser.institution || 'Main Campus'} (Hostel / Faculty)`);
  const [contactHours, setContactHours] = useState(initialProduct?.contactHours || '8:00 AM - 9:00 PM');
  const [tagsInput, setTagsInput] = useState(initialProduct?.tags?.join(', ') || 'Campus, StudentDeal');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  if (!isOpen) return null;

  const processImageFile = async (file: File) => {
    if (!file.type.startsWith('image/')) {
      setError('Please select a valid image file (PNG, JPG, JPEG, WebP).');
      return;
    }

    // Limit original file size to strictly maximum 2MB
    if (file.size > 2 * 1024 * 1024) {
      setError('Selected image exceeds the 2MB size limit. Please choose an image under 2MB.');
      return;
    }

    setError('');
    setIsCompressing(true);

    try {
      const result = await compressProductImage(file, 1024, 0.82);
      if (!result.dataUrl) {
        throw new Error('Failed to read image data.');
      }
      setImageUrl(result.dataUrl);
      setFileName(file.name);
    } catch (err: any) {
      console.error('Error processing device image:', err);
      setError('Could not process the selected image. Please try another photo.');
    } finally {
      setIsCompressing(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processImageFile(file);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const file = e.dataTransfer.files?.[0];
    if (file) {
      processImageFile(file);
    }
  };

  const handleRemoveImage = () => {
    setImageUrl('');
    setFileName('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');

    if (!initialProduct && eligibility.userTier === 'free') {
      setError('Free users cannot list products. Please upgrade to a Premium or VIP subscription to start selling on Minimart.');
      return;
    }

    if (!productName.trim()) {
      setError('Please enter a product title.');
      return;
    }
    const numPrice = Number(price.replace(/[^0-9.]/g, ''));
    if (isNaN(numPrice) || numPrice < 0) {
      setError('Please provide a valid price.');
      return;
    }
    if (!description.trim()) {
      setError('Please provide a brief description.');
      return;
    }
    if (!imageUrl.trim()) {
      setError('Please upload a photo of your item from your device.');
      return;
    }
    if (!whatsappNumber.trim()) {
      setError('Please enter your WhatsApp contact number.');
      return;
    }

    const selectedCategory = minimartCategories.find(c => c.id === categoryId);
    const tags = tagsInput
      .split(',')
      .map(t => t.trim().replace(/^#/, ''))
      .filter(Boolean);

    setLoading(true);

    try {
      if (initialProduct) {
        const res = await updateMinimartProduct(initialProduct.id, {
          productName: productName.trim(),
          categoryId,
          categoryName: selectedCategory?.name || 'General',
          price: numPrice,
          isNegotiable,
          condition,
          description: description.trim(),
          imageUrls: [imageUrl.trim()],
          images: [imageUrl.trim()],
          whatsappNumber: whatsappNumber.trim(),
          locationCampus: locationCampus.trim(),
          contactHours: contactHours.trim(),
          tags,
        });
        if (!res.success) {
          setError(res.error || 'Failed to update product.');
          setLoading(false);
          return;
        }
        setSuccessMsg('Product updated successfully!');
      } else {
        const res = await addMinimartProduct({
          productName: productName.trim(),
          categoryId,
          categoryName: selectedCategory?.name || 'General',
          price: numPrice,
          currency: 'NGN',
          isNegotiable,
          condition,
          description: description.trim(),
          imageUrls: [imageUrl.trim()],
          images: [imageUrl.trim()],
          whatsappNumber: whatsappNumber.trim(),
          sellerId: currentUser.id,
          sellerName: currentUser.name,
          sellerUsername: currentUser.username,
          sellerProfileImage: currentUser.avatar || '',
          sellerAvatar: currentUser.avatar,
          sellerInstitution: currentUser.institution || 'Grobaax Campus',
          institutionName: currentUser.institution || 'Grobaax Campus',
          institutionId: currentUser.institutionId || '',
          sellerDepartment: currentUser.department || 'Student',
          sellerVerified: currentUser.verified || false,
          locationCampus: locationCampus.trim(),
          contactHours: contactHours.trim(),
          tags,
          subscriptionPlan: 'free',
          listingDurationHours: eligibility.listingDurationHours || 12,
          status: 'active',
        });
        if (!res.success) {
          setError(res.error || 'Failed to create listing.');
          setLoading(false);
          return;
        }
        setSuccessMsg('Product listed successfully on Grobaax Minimart!');
      }

      setTimeout(() => {
        onClose();
      }, 900);
    } catch (err: any) {
      setError(err.message || 'An unexpected error occurred.');
    } finally {
      setLoading(false);
    }
  };


  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-xs overflow-y-auto animate-in fade-in duration-200">
      <div className="relative w-full max-w-xl bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden my-6">
        {/* Top Header Banner */}
        <div className="px-6 py-4 bg-gradient-to-r from-blue-950 via-blue-900 to-indigo-950 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-amber-400/20 text-amber-300 border border-amber-400/30">
              <ShoppingBag className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-black tracking-tight">
                {initialProduct ? 'Edit Product Listing' : 'List Item on Minimart'}
              </h3>
              <p className="text-xs text-blue-200">
                School-focused student discovery & direct WhatsApp connection
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-blue-200 hover:text-white hover:bg-white/10 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Free Plan Full Paywall State */}
        {!initialProduct && eligibility.userTier === 'free' ? (
          <div className="p-6 sm:p-8 space-y-6 text-center">
            <div className="w-16 h-16 rounded-3xl bg-gradient-to-tr from-amber-500/20 via-amber-400/20 to-amber-500/10 text-amber-500 border border-amber-500/30 flex items-center justify-center mx-auto shadow-inner">
              <Crown className="w-8 h-8" />
            </div>

            <div className="space-y-2 max-w-md mx-auto">
              <span className="px-3 py-1 rounded-full text-[11px] font-black uppercase tracking-wider bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                🔒 Free Scholar Account
              </span>
              <h3 className="text-xl font-black text-slate-900 dark:text-white">
                Seller Subscription Required
              </h3>
              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                To maintain a safe, trusted, and scam-free campus marketplace, listing products and services on Grobaax Minimart is exclusive to active <strong className="text-amber-600 dark:text-amber-400">Premium</strong> and <strong className="text-amber-600 dark:text-amber-400">VIP</strong> scholars.
              </p>
            </div>

            {/* Feature comparison / perks */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-left max-w-lg mx-auto">
              <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 space-y-1">
                <div className="flex items-center gap-2 font-bold text-xs text-slate-900 dark:text-white">
                  <span className="text-base">⭐</span>
                  <span>Premium Plan</span>
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-normal">
                  List up to 3 items per day with 12-hour live campus visibility and verified scholar badge.
                </p>
              </div>

              <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/30 space-y-1">
                <div className="flex items-center gap-2 font-bold text-xs text-amber-700 dark:text-amber-300">
                  <span className="text-base">👑</span>
                  <span>VIP Titan Plan</span>
                </div>
                <p className="text-[11px] text-amber-900/80 dark:text-amber-200/80 leading-normal">
                  List up to 6 items daily with 12-hour live visibility, priority search placement, and VIP badge.
                </p>
              </div>
            </div>

            {/* Perks bullet checklist */}
            <div className="p-3.5 rounded-2xl bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900/50 max-w-lg mx-auto text-left">
              <div className="text-xs font-bold text-blue-900 dark:text-blue-200 mb-1.5">
                Every Subscriber Enjoys:
              </div>
              <ul className="text-[11px] text-slate-600 dark:text-slate-300 space-y-1">
                <li className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                  <span>Direct 1-on-1 student contacts via WhatsApp</span>
                </li>
                <li className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                  <span>Verified seller badging on product cards</span>
                </li>
                <li className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                  <span>0% commission — Keep 100% of your earnings</span>
                </li>
              </ul>
            </div>

            {/* CTAs */}
            <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
              <button
                type="button"
                onClick={() => {
                  onClose();
                  openWalletModal('upgrade');
                }}
                className="w-full sm:w-auto px-6 py-3 rounded-2xl text-xs font-black bg-gradient-to-r from-amber-400 via-amber-500 to-amber-600 hover:from-amber-300 hover:to-amber-500 text-slate-950 shadow-lg shadow-amber-950/20 transition-all transform hover:scale-[1.02] active:scale-[0.98] cursor-pointer flex items-center justify-center gap-2"
              >
                <Zap className="w-4 h-4 fill-current" />
                <span>Subscribe to Start Selling</span>
              </button>
              <button
                type="button"
                onClick={onClose}
                className="w-full sm:w-auto px-5 py-3 rounded-2xl text-xs font-bold text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
              >
                Browse Minimart as Buyer
              </button>
            </div>
          </div>
        ) : (
          <>
            {/* Eligible Plan Quota Status */}
            {!initialProduct && eligibility.userTier !== 'free' && (
              <div className="mx-6 mt-4 p-3 bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900/50 rounded-2xl flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <span className={`px-2 py-0.5 rounded-full font-bold uppercase text-[10px] ${
                    eligibility.userTier === 'vip'
                      ? 'bg-amber-400 text-slate-950'
                      : 'bg-blue-600 text-white'
                  }`}>
                    {eligibility.userTier} Scholar
                  </span>
                  <span className="text-slate-600 dark:text-slate-300 font-medium">
                    {eligibility.remainingToday} of {eligibility.dailyLimit} listings left today
                  </span>
                </div>
                <div className="flex items-center gap-1 text-slate-500 dark:text-slate-400 font-semibold">
                  <Clock className="w-3.5 h-3.5 text-blue-500" />
                  <span>{eligibility.listingDurationHours}h live duration</span>
                </div>
              </div>
            )}

            {/* Error / Success Feedback */}
            {error && (
              <div className="mx-6 mt-4 p-3 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-xs text-rose-700 dark:text-rose-300 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
                <span>{error}</span>
              </div>
            )}

            {successMsg && (
              <div className="mx-6 mt-4 p-3 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-xs text-emerald-700 dark:text-emerald-300 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-500" />
                <span>{successMsg}</span>
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[72vh] overflow-y-auto">
          {/* Title */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              Product / Service Title *
            </label>
            <input
              type="text"
              required
              disabled={eligibility.userTier === 'free' && !initialProduct}
              value={productName}
              onChange={e => setProductName(e.target.value)}
              placeholder="e.g., Engineering Mathematics 101 Textbook (Mint Condition)"
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:ring-2 focus:ring-blue-600 focus:outline-hidden disabled:opacity-50"
            />
          </div>

          {/* Category & Condition Row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Category *
              </label>
              <select
                value={categoryId}
                disabled={eligibility.userTier === 'free' && !initialProduct}
                onChange={e => setCategoryId(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-blue-600 focus:outline-hidden cursor-pointer disabled:opacity-50"
              >
                {minimartCategories.map(cat => (
                  <option key={cat.id} value={cat.id}>
                    {cat.icon ? `${cat.icon} ` : ''}{cat.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Item Condition
              </label>
              <select
                value={condition}
                disabled={eligibility.userTier === 'free' && !initialProduct}
                onChange={e => setCondition(e.target.value as any)}
                className="w-full px-3 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-blue-600 focus:outline-hidden cursor-pointer disabled:opacity-50"
              >
                <option value="Brand New">Brand New (Sealed / Unused)</option>
                <option value="Like New">Like New (Barely Used)</option>
                <option value="Used - Good">Used - Good Condition</option>
                <option value="Used - Fair">Used - Fair Condition</option>
                <option value="Service">Campus Service / Skill</option>
              </select>
            </div>
          </div>

          {/* Price & Negotiable */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-end">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Price (₦ NGN) *
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-black text-slate-500">
                  ₦
                </span>
                <input
                  type="number"
                  min="0"
                  required
                  disabled={eligibility.userTier === 'free' && !initialProduct}
                  value={price}
                  onChange={e => setPrice(e.target.value)}
                  placeholder="3500"
                  className="w-full pl-8 pr-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-sm font-bold text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-blue-600 focus:outline-hidden disabled:opacity-50"
                />
              </div>
            </div>

            <div className="flex items-center gap-2 p-2.5 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700">
              <input
                type="checkbox"
                id="isNegotiable"
                checked={isNegotiable}
                disabled={eligibility.userTier === 'free' && !initialProduct}
                onChange={e => setIsNegotiable(e.target.checked)}
                className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 cursor-pointer"
              />
              <label htmlFor="isNegotiable" className="text-xs font-semibold text-slate-700 dark:text-slate-300 cursor-pointer select-none">
                Price is Negotiable
              </label>
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              Description & Specifications *
            </label>
            <textarea
              rows={3}
              required
              disabled={eligibility.userTier === 'free' && !initialProduct}
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Provide clean details on the item's condition, why you are selling, included accessories, or tutoring syllabus."
              className="w-full p-3 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-blue-600 focus:outline-hidden resize-none disabled:opacity-50"
            />
          </div>

          {/* Product Image Selection - Device Upload */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <Camera className="w-3.5 h-3.5 text-blue-500" />
                <span>Product Photo (From Device) *</span>
              </label>
              {imageUrl && (
                <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" />
                  <span>Photo Ready</span>
                </span>
              )}
            </div>

            {/* Hidden File Input for Device Files/Camera */}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              disabled={eligibility.userTier === 'free' && !initialProduct}
              onChange={handleFileChange}
              className="hidden"
            />

            {!imageUrl ? (
              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => {
                  if (eligibility.userTier !== 'free' || initialProduct) {
                    fileInputRef.current?.click();
                  }
                }}
                className={`relative border-2 border-dashed rounded-2xl p-5 text-center transition cursor-pointer flex flex-col items-center justify-center gap-2 ${
                  isDragging
                    ? 'border-blue-500 bg-blue-50/80 dark:bg-blue-950/40'
                    : 'border-slate-300 dark:border-slate-700 hover:border-blue-500 dark:hover:border-blue-400 bg-slate-50/60 dark:bg-slate-800/40 hover:bg-slate-100/80 dark:hover:bg-slate-800/80'
                } ${eligibility.userTier === 'free' && !initialProduct ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                {isCompressing ? (
                  <div className="py-4 flex flex-col items-center gap-2 text-blue-600 dark:text-blue-400">
                    <Loader2 className="w-8 h-8 animate-spin" />
                    <span className="text-xs font-bold">Optimizing photo from device...</span>
                  </div>
                ) : (
                  <>
                    <div className="w-12 h-12 rounded-2xl bg-blue-50 dark:bg-blue-950/60 border border-blue-200/80 dark:border-blue-800/60 text-blue-600 dark:text-blue-400 flex items-center justify-center shadow-xs">
                      <Camera className="w-6 h-6" />
                    </div>
                    <div className="space-y-0.5">
                      <p className="text-xs font-bold text-slate-800 dark:text-slate-200">
                        Select Photo from Device
                      </p>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400">
                        Tap to choose from phone gallery, camera, or files (Max 2MB)
                      </p>
                    </div>
                    <div className="flex items-center gap-1 text-[10px] font-semibold text-blue-600 dark:text-blue-400 bg-blue-100/70 dark:bg-blue-950/70 px-2.5 py-1 rounded-full border border-blue-200 dark:border-blue-900/50 mt-1">
                      <Upload className="w-3 h-3" />
                      <span>Browse Device Photos</span>
                    </div>
                  </>
                )}
              </div>
            ) : (
              <div className="space-y-2">
                <div className="relative rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-700 bg-slate-900 h-44 sm:h-48 group shadow-inner">
                  <img
                    src={imageUrl}
                    alt="Product item preview"
                    className="w-full h-full object-contain bg-slate-950/40"
                  />
                  {isCompressing && (
                    <div className="absolute inset-0 bg-slate-950/70 backdrop-blur-xs flex flex-col items-center justify-center gap-2 text-white">
                      <Loader2 className="w-6 h-6 animate-spin text-blue-400" />
                      <span className="text-xs font-semibold">Updating photo...</span>
                    </div>
                  )}
                  <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between pointer-events-none">
                    <span className="px-2.5 py-1 rounded-lg bg-slate-950/80 backdrop-blur-md text-[10px] text-white font-semibold flex items-center gap-1 border border-white/10">
                      <FileImage className="w-3 h-3 text-amber-400" />
                      <span className="truncate max-w-[140px] sm:max-w-[220px]">
                        {fileName || 'Device Photo Attached'}
                      </span>
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    disabled={isCompressing || (eligibility.userTier === 'free' && !initialProduct)}
                    onClick={() => fileInputRef.current?.click()}
                    className="flex-1 py-2 px-3 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-200 transition cursor-pointer flex items-center justify-center gap-1.5 disabled:opacity-50"
                  >
                    <RefreshCw className="w-3.5 h-3.5 text-blue-500" />
                    <span>Change Photo</span>
                  </button>
                  <button
                    type="button"
                    disabled={isCompressing || (eligibility.userTier === 'free' && !initialProduct)}
                    onClick={handleRemoveImage}
                    className="py-2 px-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 dark:hover:bg-rose-900/60 border border-rose-200 dark:border-rose-800/60 text-xs font-bold text-rose-600 dark:text-rose-400 transition cursor-pointer flex items-center justify-center gap-1.5 disabled:opacity-50"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Remove</span>
                  </button>
                </div>
              </div>
            )}
          </div>


          {/* WhatsApp & Campus Location */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1">
                <Phone className="w-3 h-3 text-emerald-500" />
                <span>WhatsApp Contact *</span>
              </label>
              <input
                type="tel"
                required
                disabled={eligibility.userTier === 'free' && !initialProduct}
                value={whatsappNumber}
                onChange={e => setWhatsappNumber(e.target.value)}
                placeholder="+2348012345678"
                className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-blue-600 focus:outline-hidden disabled:opacity-50"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1">
                <MapPin className="w-3 h-3 text-rose-500" />
                <span>Hostel / Campus Pickup</span>
              </label>
              <input
                type="text"
                disabled={eligibility.userTier === 'free' && !initialProduct}
                value={locationCampus}
                onChange={e => setLocationCampus(e.target.value)}
                placeholder="e.g. Moremi Hall / Faculty Quad"
                className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-blue-600 focus:outline-hidden disabled:opacity-50"
              />
            </div>
          </div>

          {/* Contact Hours & Tags */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1">
                <Clock className="w-3 h-3 text-slate-400" />
                <span>Best Contact Hours</span>
              </label>
              <input
                type="text"
                disabled={eligibility.userTier === 'free' && !initialProduct}
                value={contactHours}
                onChange={e => setContactHours(e.target.value)}
                placeholder="e.g., 9:00 AM - 8:00 PM"
                className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-blue-600 focus:outline-hidden disabled:opacity-50"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1">
                <Tag className="w-3 h-3 text-slate-400" />
                <span>Tags (comma separated)</span>
              </label>
              <input
                type="text"
                disabled={eligibility.userTier === 'free' && !initialProduct}
                value={tagsInput}
                onChange={e => setTagsInput(e.target.value)}
                placeholder="Textbook, UNILAG, Urgent"
                className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-blue-600 focus:outline-hidden disabled:opacity-50"
              />
            </div>
          </div>

          {/* Action Buttons */}
          <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || (eligibility.userTier === 'free' && !initialProduct)}
              className="px-6 py-2.5 rounded-xl text-xs font-black bg-gradient-to-r from-blue-900 to-indigo-900 hover:from-blue-800 hover:to-indigo-800 text-white shadow-md shadow-blue-950/30 transition cursor-pointer disabled:opacity-50 flex items-center gap-2"
            >
              {loading ? (
                <span>Publishing...</span>
              ) : (
                <>
                  <ShoppingBag className="w-4 h-4" />
                  <span>{initialProduct ? 'Save Changes' : 'Publish Listing'}</span>
                </>
              )}
            </button>
          </div>
        </form>
      </>
    )}
  </div>
</div>
  );
};
