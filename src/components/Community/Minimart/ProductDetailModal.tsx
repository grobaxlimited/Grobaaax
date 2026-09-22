import React from 'react';
import { useApp } from '../../../context/AppContext';
import { MinimartProduct } from '../../../types';
import {
  X,
  Phone,
  MapPin,
  Clock,
  Tag,
  ShieldCheck,
  ShieldAlert,
  Share2,
  Flag,
  Trash2,
  Edit3,
  Calendar,
  DollarSign,
  AlertCircle,
  ExternalLink,
  MessageCircle,
  CheckCircle,
} from 'lucide-react';
import { TwitterVerifiedBadge, PremiumPackageBadge } from '../../ui/UserBadgeItem';
import { openExternalWhatsApp } from '../../../lib/whatsappUtils';

interface ProductDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  product: MinimartProduct | null;
  onEdit?: (product: MinimartProduct) => void;
  onReport?: (product: MinimartProduct) => void;
  onDelete?: (product: MinimartProduct) => void;
}

export const ProductDetailModal: React.FC<ProductDetailModalProps> = ({
  isOpen,
  onClose,
  product,
  onEdit,
  onReport,
  onDelete,
}) => {
  const { currentUser, role, deleteMinimartProduct, updateMinimartProductStatus } = useApp();
  const [isConfirmingDelete, setIsConfirmingDelete] = React.useState(false);
  const [isConfirmingMarkSold, setIsConfirmingMarkSold] = React.useState(false);
  const [isProcessing, setIsProcessing] = React.useState(false);

  if (!isOpen || !product) return null;

  const isOwner =
    currentUser?.id === product.sellerId ||
    (!!currentUser?.name && !!product.sellerName && currentUser.name.toLowerCase() === product.sellerName.toLowerCase());
  const isAdmin = role === 'admin';

  // Format WhatsApp Link
  const cleanPhone = (product.whatsappNumber || '').replace(/[^0-9]/g, '');
  const waPhone = cleanPhone.startsWith('0')
    ? `234${cleanPhone.slice(1)}`
    : cleanPhone.startsWith('234')
    ? cleanPhone
    : `234${cleanPhone}`;

  const messageText = encodeURIComponent(
    `Hello ${product.sellerName || 'Scholar'}, I saw your listing for "${product.productName}" (₦${product.price.toLocaleString()}) on Grobaax Minimart. Is this still available on campus?`
  );
  const waUrl = `https://wa.me/${waPhone}?text=${messageText}`;

  // Time remaining calculation
  const now = Date.now();
  const expTime = product.expiresAt ? new Date(product.expiresAt).getTime() : 0;
  const hoursLeft = Math.max(0, Math.round((expTime - now) / (1000 * 60 * 60)));
  const isExpired = product.status === 'expired' || (expTime > 0 && now >= expTime);

  const handleDelete = async () => {
    if (onDelete) {
      onDelete(product);
      onClose();
      return;
    }
    setIsProcessing(true);
    try {
      await deleteMinimartProduct(product.id || product.productId);
      onClose();
    } finally {
      setIsProcessing(false);
    }
  };

  const handleMarkSold = async () => {
    setIsProcessing(true);
    try {
      await updateMinimartProductStatus(product.id || product.productId, 'archived');
      onClose();
    } finally {
      setIsProcessing(false);
    }
  };

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: `${product.productName} - Grobaax Minimart`,
        text: `Check out ${product.productName} for ₦${product.price.toLocaleString()} on Grobaax Minimart!`,
        url: window.location.href,
      }).catch(() => {});
    } else {
      navigator.clipboard.writeText(
        `Check out ${product.productName} for ₦${product.price.toLocaleString()} on Grobaax Minimart!`
      );
      alert('Product link copied to clipboard!');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-xs overflow-y-auto animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden my-6">
        {/* Top Header */}
        <div className="p-4 bg-slate-100 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-900 text-white">
              {product.categoryName || 'Minimart Item'}
            </span>
            {product.isNegotiable && (
              <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                Negotiable
              </span>
            )}
            <span className={`px-2 py-0.5 rounded-full text-[11px] font-semibold ${
              isExpired
                ? 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                : product.status === 'suspended'
                ? 'bg-rose-500/20 text-rose-600'
                : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
            }`}>
              {isExpired ? 'Listing Expired' : product.status.toUpperCase()}
            </span>
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={handleShare}
              title="Share listing"
              className="p-2 text-slate-500 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl transition cursor-pointer"
            >
              <Share2 className="w-4 h-4" />
            </button>
            <button
              onClick={onClose}
              className="p-2 text-slate-500 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Body Content */}
        <div className="max-h-[75vh] overflow-y-auto p-5 sm:p-6 space-y-5">
          {/* Main Image */}
          <div className="w-full h-64 sm:h-72 rounded-2xl overflow-hidden bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 relative">
            <img
              src={
                (product.imageUrls && product.imageUrls[0]) ||
                (product as any).images?.[0] ||
                'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=600&auto=format&fit=crop&q=80'
              }
              alt={product.productName}
              className="w-full h-full object-cover"
              onError={(e) => {
                (e.target as any).src = 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=600&auto=format&fit=crop&q=80';
              }}
            />
            {product.condition && (
              <span className="absolute top-3 left-3 px-3 py-1 rounded-xl bg-slate-950/80 backdrop-blur-xs text-white text-xs font-bold border border-white/10 shadow-md">
                {product.condition}
              </span>
            )}
          </div>

          {/* Title & Price Header */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 pb-4 border-b border-slate-200 dark:border-slate-800">
            <div>
              <h2 className="text-xl font-black text-slate-900 dark:text-slate-100">
                {product.productName}
              </h2>
              <div className="flex items-center gap-2 mt-1 text-xs text-slate-500 dark:text-slate-400">
                <span className="flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5" />
                  <span>Posted {new Date(product.createdAt).toLocaleDateString()}</span>
                </span>
                {!isExpired && hoursLeft > 0 && (
                  <span className="flex items-center gap-1 text-blue-600 dark:text-blue-400 font-semibold">
                    <Clock className="w-3.5 h-3.5" />
                    <span>Expires in ~{hoursLeft}h</span>
                  </span>
                )}
              </div>
            </div>

            <div className="text-left sm:text-right">
              <div className="text-2xl sm:text-3xl font-black text-emerald-600 dark:text-emerald-400">
                ₦{product.price.toLocaleString()}
              </div>
              <span className="text-[11px] text-slate-500 font-medium">
                {product.isNegotiable ? 'Negotiable Price' : 'Fixed Price'}
              </span>
            </div>
          </div>

          {/* Seller Profile Card */}
          <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-200 dark:border-slate-700/80 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <img
                src={product.sellerAvatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80'}
                alt={product.sellerName}
                className="w-12 h-12 rounded-full object-cover border-2 border-blue-900/30"
              />
              <div>
                <div className="flex items-center gap-1.5 font-bold text-slate-900 dark:text-slate-100 text-sm flex-wrap">
                  <span>{product.sellerName || 'Student Seller'}</span>
                  {product.sellerVerified !== false && (
                    <TwitterVerifiedBadge className="w-4 h-4" />
                  )}
                  <PremiumPackageBadge
                    tier={product.subscriptionPlan || (product as any).sellerTier || 'free'}
                  />
                </div>
                <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  {product.sellerInstitution || 'Grobaax Scholar'} • {product.sellerDepartment || 'Student'}
                </div>
              </div>
            </div>

            {/* Direct WhatsApp Callout Button */}
            {!isExpired && product.status === 'active' && (
              <button
                type="button"
                onClick={() => openExternalWhatsApp(waUrl)}
                className="px-4 py-2.5 rounded-xl text-xs font-black bg-emerald-600 hover:bg-emerald-500 text-white shadow-md shadow-emerald-950/20 transition flex items-center gap-2 cursor-pointer shrink-0"
              >
                <MessageCircle className="w-4 h-4" />
                <span className="hidden sm:inline">Chat on WhatsApp</span>
                <span className="sm:hidden">Chat</span>
              </button>
            )}
          </div>

          {/* Description */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">
              Item Details & Description
            </h4>
            <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-line bg-slate-50 dark:bg-slate-800/30 p-4 rounded-2xl border border-slate-200 dark:border-slate-800">
              {product.description}
            </p>
          </div>

          {/* Campus Location & Hours */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="p-3.5 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200 dark:border-slate-700/80 flex items-start gap-2.5">
              <MapPin className="w-4 h-4 text-rose-500 mt-0.5 shrink-0" />
              <div>
                <div className="text-xs font-bold text-slate-800 dark:text-slate-200">
                  Campus / Hostel Pickup
                </div>
                <div className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
                  {product.locationCampus || 'On-campus public quad or faculty'}
                </div>
              </div>
            </div>

            <div className="p-3.5 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200 dark:border-slate-700/80 flex items-start gap-2.5">
              <Clock className="w-4 h-4 text-blue-500 mt-0.5 shrink-0" />
              <div>
                <div className="text-xs font-bold text-slate-800 dark:text-slate-200">
                  Best Contact Hours
                </div>
                <div className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
                  {product.contactHours || 'Standard daylight hours (9:00 AM - 8:00 PM)'}
                </div>
              </div>
            </div>
          </div>

          {/* Tags */}
          {product.tags && product.tags.length > 0 && (
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">
                Tags
              </h4>
              <div className="flex flex-wrap gap-1.5">
                {product.tags.map((t, idx) => (
                  <span
                    key={idx}
                    className="px-2.5 py-1 rounded-lg bg-blue-500/10 text-blue-700 dark:text-blue-300 text-xs font-medium border border-blue-500/20"
                  >
                    #{t}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Safety Notice */}
          <div className="p-3.5 bg-amber-500/10 border border-amber-500/30 rounded-2xl text-xs text-amber-900 dark:text-amber-200 flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <span className="font-black">Campus Safety Tip:</span>
              <p className="text-[11px] leading-relaxed text-amber-800/90 dark:text-amber-300/90">
                Grobaax Minimart is for discovery only. Always meet in busy, well-lit campus areas (library, faculty quad, cafeteria). Never transfer money before inspecting items in person.
              </p>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 bg-slate-100 dark:bg-slate-800/80 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3">
          <div>
            {!isOwner && onReport && (
              <button
                type="button"
                onClick={() => onReport(product)}
                className="px-3 py-2 rounded-xl text-xs font-semibold text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition cursor-pointer flex items-center gap-1.5"
              >
                <Flag className="w-3.5 h-3.5" />
                <span>Report Listing</span>
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            {(isOwner || isAdmin) && onEdit && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onEdit(product);
                }}
                className="px-3 py-2 rounded-xl text-xs font-bold bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-200 hover:bg-slate-300 dark:hover:bg-slate-600 transition cursor-pointer flex items-center gap-1.5"
              >
                <Edit3 className="w-3.5 h-3.5" />
                <span>Edit</span>
              </button>
            )}

            {isOwner && product.status === 'active' && (
              <button
                type="button"
                onClick={handleMarkSold}
                className="px-3 py-2 rounded-xl text-xs font-bold bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-200 hover:bg-slate-300 dark:hover:bg-slate-600 transition cursor-pointer flex items-center gap-1.5"
              >
                <CheckCircle className="w-3.5 h-3.5 text-emerald-500" />
                <span>Mark Sold</span>
              </button>
            )}

            {(isOwner || isAdmin) && (
              <button
                type="button"
                onClick={handleDelete}
                className="px-3 py-2 rounded-xl text-xs font-bold bg-rose-600/10 text-rose-600 hover:bg-rose-600 hover:text-white transition cursor-pointer flex items-center gap-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete</span>
              </button>
            )}

            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-bold bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-950 hover:bg-slate-800 transition cursor-pointer"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
