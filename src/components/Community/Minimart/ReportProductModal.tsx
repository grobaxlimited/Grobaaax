import React, { useState } from 'react';
import { useApp } from '../../../context/AppContext';
import { MinimartProduct, MinimartReportReason } from '../../../types';
import {
  X,
  ShieldAlert,
  AlertTriangle,
  CheckCircle2,
  Flag,
} from 'lucide-react';

interface ReportProductModalProps {
  isOpen: boolean;
  onClose: () => void;
  product: MinimartProduct | null;
}

const REPORT_REASONS: { value: MinimartReportReason; label: string; description: string }[] = [
  {
    value: 'Scam',
    label: 'Scam or Fraudulent Offer',
    description: 'Suspicious seller, payment demand before meeting, or deceptive behavior.',
  },
  {
    value: 'Prohibited item',
    label: 'Prohibited / Illegal Campus Item',
    description: 'Contraband, weapons, academic fraud services, or restricted campus materials.',
  },
  {
    value: 'Misleading information',
    label: 'Misleading Price or Fake Condition',
    description: 'Bait-and-switch pricing, wrong pictures, or undisclosed damage.',
  },
  {
    value: 'Fake product',
    label: 'Fake / Counterfeit Material',
    description: 'Unauthorized copies, fake electronics, or pirated copyrighted material.',
  },
  {
    value: 'Inappropriate content',
    label: 'Inappropriate or Offensive Content',
    description: 'Vulgar text, NSFW images, or explicit academic violations.',
  },
  {
    value: 'Spam',
    label: 'Spam / Repeated Listings',
    description: 'Unsolicited repetitive postings or irrelevant commercial links.',
  },
  {
    value: 'Other',
    label: 'Other Policy Violation',
    description: 'Any other violation of Grobaax community safety standards.',
  },
];

export const ReportProductModal: React.FC<ReportProductModalProps> = ({
  isOpen,
  onClose,
  product,
}) => {
  const { reportMinimartProduct } = useApp();
  const [selectedReason, setSelectedReason] = useState<MinimartReportReason>('Scam');
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  if (!isOpen || !product) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);

    try {
      const res = await reportMinimartProduct(product.id, selectedReason, description.trim());
      if (!res.success) {
        setError(res.error || 'Failed to submit report.');
        setSubmitting(false);
        return;
      }
      setSuccess(true);
      setTimeout(() => {
        setSuccess(false);
        setDescription('');
        onClose();
      }, 1200);
    } catch (err: any) {
      setError(err.message || 'Failed to submit report.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 bg-rose-950 text-white flex items-center justify-between border-b border-rose-900/50">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-rose-500/20 text-rose-300 border border-rose-500/30">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold">Report Listing to Grobaax Security</h3>
              <p className="text-xs text-rose-200 truncate max-w-xs">{product.productName}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-rose-200 hover:text-white hover:bg-rose-900/50 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 rounded-xl text-xs text-rose-700 dark:text-rose-300 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0 text-rose-500" />
              <span>{error}</span>
            </div>
          )}

          {success && (
            <div className="p-3 bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 rounded-xl text-xs text-emerald-700 dark:text-emerald-300 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-500" />
              <span>Report submitted. Grobaax moderators will review this listing shortly.</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-2">
              Select Violation Reason
            </label>
            <div className="space-y-2 max-h-52 overflow-y-auto pr-1">
              {REPORT_REASONS.map(r => (
                <label
                  key={r.value}
                  className={`block p-2.5 rounded-xl border transition cursor-pointer ${
                    selectedReason === r.value
                      ? 'bg-rose-50 dark:bg-rose-950/30 border-rose-500/50 ring-1 ring-rose-500'
                      : 'bg-slate-50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-800 hover:bg-slate-100'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <input
                      type="radio"
                      name="reportReason"
                      value={r.value}
                      checked={selectedReason === r.value}
                      onChange={() => setSelectedReason(r.value)}
                      className="text-rose-600 focus:ring-rose-500"
                    />
                    <span className="text-xs font-bold text-slate-900 dark:text-slate-100">
                      {r.label}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 pl-5">
                    {r.description}
                  </p>
                </label>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              Additional Details (Optional)
            </label>
            <textarea
              rows={3}
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Please provide any additional context or proof of suspicious activity..."
              className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-rose-500 focus:outline-hidden resize-none"
            />
          </div>

          <div className="pt-2 border-t border-slate-200 dark:border-slate-800 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white shadow-md shadow-rose-950/30 transition cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
            >
              <Flag className="w-3.5 h-3.5" />
              <span>{submitting ? 'Submitting...' : 'Submit Report'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
