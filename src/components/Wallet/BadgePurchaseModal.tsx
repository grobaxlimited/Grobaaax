import React from 'react';
import { BadgeStoreItem } from '../../types';
import { useApp } from '../../context/AppContext';
import { X, CheckCircle, AlertTriangle, ShieldCheck } from 'lucide-react';

interface BadgePurchaseModalProps {
  badge: BadgeStoreItem | null;
  onClose: () => void;
}

export const BadgePurchaseModal: React.FC<BadgePurchaseModalProps> = ({ badge, onClose }) => {
  const { currentUser, buyBadge, equipBadge } = useApp();

  if (!badge) return null;

  const hasEnoughGp = (typeof currentUser.gpBalance === 'number' ? currentUser.gpBalance : Number(currentUser.gpBalance || 0)) >= badge.gpPrice;
  const isAlreadyPurchased = currentUser.purchasedBadgeIds.includes(badge.id);

  const [errorMessage, setErrorMessage] = React.useState<string>('');
  const [isProcessing, setIsProcessing] = React.useState<boolean>(false);

  const handleBuy = async () => {
    setErrorMessage('');
    if (isAlreadyPurchased) {
      equipBadge(badge.id);
      onClose();
      return;
    }

    setIsProcessing(true);
    try {
      const success = await buyBadge(badge);
      if (success) {
        equipBadge(badge.id);
        onClose();
      } else {
        setErrorMessage('Insufficient GP balance to purchase this badge.');
      }
    } catch {
      setErrorMessage('An unexpected error occurred. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="relative w-full max-w-sm bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl p-6 text-center space-y-4">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="w-16 h-16 mx-auto rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-3xl shadow-inner">
          {badge.image}
        </div>

        <div>
          <h3 className="text-lg font-black text-slate-900 dark:text-slate-100">{badge.name}</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{badge.description}</p>
        </div>

        <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700 space-y-1 text-xs">
          <div className="flex justify-between text-slate-600 dark:text-slate-400">
            <span>Price:</span>
            <span className="font-bold text-amber-600 dark:text-amber-400">{badge.gpPrice} GP</span>
          </div>
          <div className="flex justify-between text-slate-600 dark:text-slate-400">
            <span>Your GP Balance:</span>
            <span className="font-bold text-emerald-600 dark:text-emerald-400">{currentUser.gpBalance} GP</span>
          </div>
        </div>

        {!hasEnoughGp && !isAlreadyPurchased && (
          <div className="p-2.5 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 rounded-xl text-xs text-rose-600 dark:text-rose-400 flex items-center gap-2 text-left">
            <AlertTriangle className="w-4 h-4 shrink-0 text-rose-500" />
            <span>You need {badge.gpPrice - currentUser.gpBalance} more GP to acquire this badge.</span>
          </div>
        )}

        {errorMessage && (
          <div className="p-2.5 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 rounded-xl text-xs text-rose-600 dark:text-rose-400 flex items-center gap-2 text-left">
            <AlertTriangle className="w-4 h-4 shrink-0 text-rose-500" />
            <span>{errorMessage}</span>
          </div>
        )}

        <div className="pt-2 flex gap-3">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-2.5 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleBuy}
            disabled={(!hasEnoughGp && !isAlreadyPurchased) || isProcessing}
            className="flex-1 py-2.5 bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-slate-950 font-black text-xs rounded-xl shadow-lg shadow-amber-500/20 cursor-pointer transition-transform active:scale-95"
          >
            {isProcessing ? 'Processing...' : isAlreadyPurchased ? 'Equip Badge' : 'Confirm Purchase'}
          </button>
        </div>
      </div>
    </div>
  );
};
