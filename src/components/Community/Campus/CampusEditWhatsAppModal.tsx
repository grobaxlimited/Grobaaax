import React, { useState } from 'react';
import { updateCampusWhatsAppNumber } from '../../../lib/campusService';
import {
  Phone,
  ShieldCheck,
  AlertCircle,
  Loader2,
  X,
} from 'lucide-react';

interface CampusEditWhatsAppModalProps {
  userId: string;
  currentNumber: string;
  isOpen: boolean;
  onClose: () => void;
  onUpdated: (newNumber: string) => void;
}

export const CampusEditWhatsAppModal: React.FC<CampusEditWhatsAppModalProps> = ({
  userId,
  currentNumber,
  isOpen,
  onClose,
  onUpdated,
}) => {
  const [phoneNumber, setPhoneNumber] = useState(currentNumber || '');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const cleaned = phoneNumber.replace(/[^0-9+]/g, '');
    const digits = cleaned.replace(/[^0-9]/g, '');

    if (digits.length < 10 || digits.length > 15) {
      setError('Please enter a valid WhatsApp phone number (10 to 15 digits).');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await updateCampusWhatsAppNumber(userId, cleaned);
      if (res.success) {
        onUpdated(cleaned);
        onClose();
      } else {
        setError(res.error || 'Failed to update WhatsApp number.');
      }
    } catch (err: any) {
      setError(err?.message || 'An error occurred.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-7 border border-slate-200 dark:border-slate-800 shadow-2xl space-y-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center">
              <Phone className="w-5 h-5" />
            </div>
            <h3 className="text-lg font-black text-slate-900 dark:text-slate-100">
              Update WhatsApp Number
            </h3>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 flex items-center justify-center text-slate-500 transition-all cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {error && (
          <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-400 text-xs font-semibold flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
              WhatsApp Phone Number
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                <Phone className="w-4 h-4 text-blue-500" />
              </div>
              <input
                id="edit-whatsapp-input"
                type="tel"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                placeholder="+234 XXX XXX XXXX"
                required
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 font-bold placeholder:font-normal placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
              />
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5 text-blue-500 shrink-0" />
              <span>Only accepted connections will be able to start a WhatsApp chat with you.</span>
            </p>
          </div>

          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-sm active:scale-95 transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Saving...</span>
                </>
              ) : (
                <span>Save Number</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
