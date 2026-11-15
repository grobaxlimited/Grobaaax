import React, { useState } from 'react';
import { SchoolBloggerApplication, UserProfile } from '../../../../types';
import {
  submitBloggerApplication,
  withdrawBloggerApplication,
} from '../../../../lib/schoolBlogService';
import {
  AlertCircle,
  BookOpen,
  Building2,
  CheckCircle2,
  Clock,
  GraduationCap,
  Loader2,
  PenTool,
  X,
  XCircle,
} from 'lucide-react';

interface BloggerApplicationModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: UserProfile;
  homeInstitutionId: string;
  homeInstitutionName: string;
  existingApplication: SchoolBloggerApplication | null;
  onSuccess: (message: string) => void;
}

export const BloggerApplicationModal: React.FC<BloggerApplicationModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  homeInstitutionId,
  homeInstitutionName,
  existingApplication,
  onSuccess,
}) => {
  const [reason, setReason] = useState('');
  const [experience, setExperience] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const applicantName =
    currentUser.name || currentUser.fullName || currentUser.username || 'Scholar';
  const department =
    currentUser.department ||
    currentUser.departmentName ||
    currentUser.academicProfile?.departmentName ||
    'General Department';
  const level =
    currentUser.level || currentUser.academicProfile?.level || '100 Level';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (reason.trim().length < 15) {
      setError('Please share at least 15 characters explaining why you want to manage your school blog.');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await submitBloggerApplication({
        targetInstitutionId: homeInstitutionId,
        targetInstitutionName: homeInstitutionName,
        reason: reason.trim(),
        experience: experience.trim(),
      });

      if (res.success) {
        onSuccess(
          res.message ||
            'Your School Blogger application has been submitted for administrative review.'
        );
        onClose();
      } else {
        setError(res.error || 'Could not submit application.');
      }
    } catch (err: any) {
      setError(err?.message || 'An unexpected error occurred.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleWithdraw = async () => {
    if (!existingApplication?.id) return;
    setError(null);
    setIsSubmitting(true);
    try {
      const res = await withdrawBloggerApplication(existingApplication.id);
      if (res.success) {
        onSuccess(res.message || 'Your blogger application has been withdrawn.');
        onClose();
      } else {
        setError(res.error || 'Failed to withdraw application.');
      }
    } catch (err: any) {
      setError(err?.message || 'An unexpected error occurred.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const hasPending = existingApplication?.status === 'Pending';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="w-full max-w-lg bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-7 border border-slate-200 dark:border-slate-800 shadow-2xl space-y-5 max-h-[90vh] overflow-y-auto">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center shrink-0">
              <PenTool className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-black text-slate-900 dark:text-white">
                Apply to Become School Blogger
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Publish official campus news, events, and academic updates for your institution.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 flex items-center justify-center text-slate-500 cursor-pointer shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Verified Identity Card */}
        <div className="p-4 rounded-2xl bg-blue-50/70 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800/60 space-y-2">
          <div className="text-[11px] font-black uppercase tracking-wider text-blue-700 dark:text-blue-300">
            Verified Student Record (Locked to Your Institution)
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
            <div>
              <span className="text-slate-500 dark:text-slate-400">Applicant Name:</span>
              <div className="font-bold text-slate-900 dark:text-white">{applicantName}</div>
            </div>
            <div>
              <span className="text-slate-500 dark:text-slate-400">Level:</span>
              <div className="font-bold text-slate-900 dark:text-white">{level}</div>
            </div>
            <div className="sm:col-span-2 flex items-center gap-1.5">
              <Building2 className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400 shrink-0" />
              <span className="font-bold text-slate-900 dark:text-white">{homeInstitutionName}</span>
            </div>
            <div className="sm:col-span-2 flex items-center gap-1.5">
              <BookOpen className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400 shrink-0" />
              <span className="font-semibold text-slate-700 dark:text-slate-300">{department}</span>
            </div>
          </div>
        </div>

        {error && (
          <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-400 text-xs font-semibold flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Existing Application Status Notice */}
        {existingApplication && existingApplication.status !== 'Withdrawn' && (
          <div
            className={`p-4 rounded-2xl border space-y-2 ${
              existingApplication.status === 'Pending'
                ? 'bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800/60'
                : existingApplication.status === 'Approved'
                ? 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800/60'
                : 'bg-rose-50 dark:bg-rose-950/30 border-rose-200 dark:border-rose-800/60'
            }`}
          >
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-black uppercase tracking-wider flex items-center gap-1.5 text-slate-900 dark:text-white">
                {existingApplication.status === 'Pending' && <Clock className="w-4 h-4 text-amber-600" />}
                {existingApplication.status === 'Approved' && (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                )}
                {existingApplication.status === 'Rejected' && <XCircle className="w-4 h-4 text-rose-600" />}
                <span>Application Status: {existingApplication.status}</span>
              </span>
              <span className="text-[11px] text-slate-500 dark:text-slate-400">
                {new Date(existingApplication.createdAt).toLocaleDateString()}
              </span>
            </div>

            {existingApplication.reviewNotes && (
              <p className="text-xs text-slate-700 dark:text-slate-300">
                <strong>Admin Note:</strong> {existingApplication.reviewNotes}
              </p>
            )}

            {hasPending && (
              <div className="pt-2 flex items-center justify-between gap-2">
                <span className="text-[11px] text-slate-600 dark:text-slate-300">
                  Our administrators are reviewing your request.
                </span>
                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={handleWithdraw}
                  className="px-3 py-1.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-xs font-bold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 cursor-pointer disabled:opacity-50"
                >
                  {isSubmitting ? 'Withdrawing...' : 'Withdraw'}
                </button>
              </div>
            )}
          </div>
        )}

        {/* Application Form (hidden when already Pending or Approved) */}
        {!hasPending && existingApplication?.status !== 'Approved' && (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                Why should you represent {homeInstitutionName}?
              </label>
              <textarea
                rows={4}
                required
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Share your vision for campus reporting, accuracy, and covering student news & events..."
                className="w-full p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-xs sm:text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                Writing or Campus Media Experience (Optional)
              </label>
              <textarea
                rows={3}
                value={experience}
                onChange={(e) => setExperience(e.target.value)}
                placeholder="E.g., Press Club, editorial board, department PRO, student newsletter..."
                className="w-full p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-xs sm:text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-[11px] text-slate-600 dark:text-slate-300 flex items-start gap-2">
              <GraduationCap className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
              <span>
                Only one active approved blogger is appointed per institution at a time. Applications are verified by Grobaax Admins.
              </span>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-sm flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Submitting...</span>
                  </>
                ) : (
                  <span>Submit Application</span>
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
