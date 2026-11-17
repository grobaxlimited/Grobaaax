import React, { useEffect, useState } from 'react';
import { SchoolBloggerApplication, UserProfile } from '../../../../types';
import {
  submitBloggerApplication,
  withdrawBloggerApplication,
} from '../../../../lib/schoolBlogService';
import {
  AlertCircle,
  Ban,
  Building2,
  CheckCircle2,
  Clock,
  Loader2,
  PenTool,
  User,
  X,
} from 'lucide-react';

interface BloggerApplicationModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: UserProfile;
  homeInstitutionId: string;
  homeInstitutionName: string;
  isSuspendedOrRevoked?: boolean;
  existingApplication?: SchoolBloggerApplication | null;
  onSubmitted: (application: SchoolBloggerApplication | null, message: string) => void;
  onRequireSubscription?: () => void;
}

export const BloggerApplicationModal: React.FC<BloggerApplicationModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  homeInstitutionId,
  homeInstitutionName,
  isSuspendedOrRevoked = false,
  existingApplication = null,
  onSubmitted,
  onRequireSubscription,
}) => {
  const defaultDepartment =
    currentUser.department ||
    currentUser.departmentName ||
    currentUser.academicProfile?.departmentName ||
    '';
  const defaultLevel =
    currentUser.level || currentUser.academicProfile?.level || '';

  const [reason, setReason] = useState('');
  const [experience, setExperience] = useState('');
  const [additionalInfo, setAdditionalInfo] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isWithdrawing, setIsWithdrawing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [requiresUpgrade, setRequiresUpgrade] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setError(null);
      setRequiresUpgrade(false);
      if (!existingApplication || existingApplication.status !== 'Pending') {
        setReason('');
        setExperience('');
        setAdditionalInfo('');
      }
    }
  }, [isOpen, existingApplication?.id, existingApplication?.status]);

  if (!isOpen) return null;

  const applicantName =
    currentUser.name || currentUser.fullName || currentUser.username || 'Scholar';

  const isPending = existingApplication?.status === 'Pending';
  const isRejected = existingApplication?.status === 'Rejected';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (reason.trim().length < 15) {
      setError('Please tell us why you want to become a School Blogger (at least 15 characters).');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await submitBloggerApplication({
        targetInstitutionId: homeInstitutionId,
        targetInstitutionName: homeInstitutionName,
        department: defaultDepartment.trim(),
        level: defaultLevel.trim(),
        reason: reason.trim(),
        experience: experience.trim(),
        additionalInfo: additionalInfo.trim(),
      });

      if (res.success) {
        onSubmitted(
          res.application || null,
          res.message ||
            `Application submitted for ${homeInstitutionName}! You will be notified after Admin review.`
        );
      } else {
        if (res.requiresSubscription || res.code === 'SUBSCRIPTION_REQUIRED') {
          setRequiresUpgrade(true);
        }
        setError(res.error || 'Could not submit application. Please try again.');
      }
    } catch (err: any) {
      setError(err?.message || 'An unexpected error occurred while submitting.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleWithdraw = async () => {
    if (!existingApplication?.id || isWithdrawing) return;
    setError(null);
    setIsWithdrawing(true);
    try {
      const res = await withdrawBloggerApplication(existingApplication.id);
      if (res.success) {
        onSubmitted(res.application || null, 'Your School Blogger application has been withdrawn.');
      } else {
        setError(res.error || 'Could not withdraw application.');
      }
    } catch (err: any) {
      setError(err?.message || 'Failed to withdraw application.');
    } finally {
      setIsWithdrawing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="w-full max-w-xl bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-7 border border-slate-200 dark:border-slate-800 shadow-2xl space-y-5 max-h-[90vh] overflow-y-auto">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center shrink-0">
              <PenTool className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-black text-slate-900 dark:text-white">
                {isSuspendedOrRevoked
                  ? 'Blogger Access Restricted'
                  : isPending
                  ? 'School Blogger Application Pending'
                  : 'Apply to Become a School Blogger'}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Application for verified students of {homeInstitutionName}
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

        {isSuspendedOrRevoked ? (
          <div className="p-5 rounded-2xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800 space-y-3">
            <div className="flex items-center gap-2 text-rose-700 dark:text-rose-300 text-sm font-black">
              <Ban className="w-5 h-5 shrink-0" />
              <span>School Blogger Access Suspended or Removed</span>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              Your School Blogger privileges for {homeInstitutionName} were suspended or revoked by Grobaax Administrators. Please contact an administrator to review your status.
            </p>
            <div className="flex justify-end">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl bg-slate-900 dark:bg-slate-800 text-white text-xs font-bold cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        ) : isPending && existingApplication ? (
          <div className="space-y-4">
            <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/70 space-y-2">
              <div className="flex items-center gap-2 text-amber-800 dark:text-amber-300 text-xs font-black uppercase tracking-wider">
                <Clock className="w-4 h-4 shrink-0" />
                <span>Pending Grobaax Admin Review</span>
              </div>
              <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
                Your application for <strong>{existingApplication.institutionName}</strong> is currently under review by Grobaax Administrators. You will be notified as soon as a decision is made.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-2.5 text-xs">
              <div className="flex justify-between gap-2">
                <span className="text-slate-500">Department &amp; Level:</span>
                <span className="font-bold text-slate-900 dark:text-white">
                  {existingApplication.department} · {existingApplication.level}
                </span>
              </div>
              <div>
                <span className="text-slate-500 block font-semibold">Reason:</span>
                <p className="text-slate-800 dark:text-slate-200 mt-0.5">{existingApplication.reason}</p>
              </div>
              {existingApplication.experience && (
                <div>
                  <span className="text-slate-500 block font-semibold">Experience:</span>
                  <p className="text-slate-800 dark:text-slate-200 mt-0.5">
                    {existingApplication.experience}
                  </p>
                </div>
              )}
              {existingApplication.additionalInfo && (
                <div>
                  <span className="text-slate-500 block font-semibold">Additional Information:</span>
                  <p className="text-slate-800 dark:text-slate-200 mt-0.5">
                    {existingApplication.additionalInfo}
                  </p>
                </div>
              )}
            </div>

            {error && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-400 text-xs font-semibold flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <div className="flex items-center justify-between gap-2 pt-1">
              <button
                type="button"
                disabled={isWithdrawing}
                onClick={handleWithdraw}
                className="px-4 py-2 rounded-xl bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 text-xs font-bold cursor-pointer disabled:opacity-50"
              >
                {isWithdrawing ? 'Withdrawing...' : 'Withdraw Application'}
              </button>
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl bg-slate-900 dark:bg-slate-800 text-white text-xs font-bold cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">

            {isRejected && existingApplication?.reviewNotes && (
              <div className="p-3.5 rounded-2xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800 text-xs space-y-1">
                <div className="font-black text-rose-700 dark:text-rose-300">
                  Previous Application Note:
                </div>
                <p className="text-slate-700 dark:text-slate-300">{existingApplication.reviewNotes}</p>
              </div>
            )}

            {/* Auto-filled Read-Only Verified Campus Identity */}
            <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="flex items-center gap-2">
                <User className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />
                <div className="min-w-0">
                  <div className="text-[10px] font-bold uppercase text-slate-500">Full Name</div>
                  <div className="font-black text-slate-900 dark:text-white truncate">{applicantName}</div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Building2 className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />
                <div className="min-w-0">
                  <div className="text-[10px] font-bold uppercase text-slate-500">
                    Verified Institution
                  </div>
                  <div className="font-black text-slate-900 dark:text-white truncate">
                    {homeInstitutionName}
                  </div>
                </div>
              </div>
            </div>

            {/* Reason for wanting to become a blogger */}
            <div className="space-y-1">
              <label
                htmlFor="blogger-app-reason"
                className="block text-xs font-bold text-slate-700 dark:text-slate-300"
              >
                Why do you want to become a School Blogger? *
              </label>
              <textarea
                id="blogger-app-reason"
                required
                rows={3}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Tell Grobaax Admins how you plan to cover campus news, events, and student stories accurately..."
                className="w-full p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-xs text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Previous writing or journalism experience (optional) */}
            <div className="space-y-1">
              <label
                htmlFor="blogger-app-experience"
                className="block text-xs font-bold text-slate-700 dark:text-slate-300"
              >
                Previous writing or journalism experience (Optional)
              </label>
              <textarea
                id="blogger-app-experience"
                rows={2}
                value={experience}
                onChange={(e) => setExperience(e.target.value)}
                placeholder="Campus press club, editorial roles, blog articles, or newsletters (if any)..."
                className="w-full p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-xs text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Additional relevant information (optional) */}
            <div className="space-y-1">
              <label
                htmlFor="blogger-app-additional"
                className="block text-xs font-bold text-slate-700 dark:text-slate-300"
              >
                Additional relevant information (Optional)
              </label>
              <textarea
                id="blogger-app-additional"
                rows={2}
                value={additionalInfo}
                onChange={(e) => setAdditionalInfo(e.target.value)}
                placeholder="Portfolio links, faculty beats, or availability notes..."
                className="w-full p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-xs text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {error && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-400 text-xs font-semibold space-y-2">
                <div className="flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{error}</span>
                </div>
                {requiresUpgrade && onRequireSubscription && (
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onRequireSubscription();
                    }}
                    className="px-3.5 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-black cursor-pointer"
                  >
                    Subscribe to Premium or VIP
                  </button>
                )}
              </div>
            )}

            <div className="flex items-center justify-end gap-2 pt-1">
              <button
                type="button"
                disabled={isSubmitting}
                onClick={onClose}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
              >
                Cancel
              </button>
              <button
                id="submit-blogger-application-btn"
                type="submit"
                disabled={isSubmitting}
                className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-black shadow-sm flex items-center gap-1.5 cursor-pointer disabled:opacity-60"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Submitting Application...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Submit Application</span>
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
