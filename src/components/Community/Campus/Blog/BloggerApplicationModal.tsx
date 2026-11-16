import React, { useEffect, useMemo, useState } from 'react';
import {
  SchoolBloggerApplication,
  SubscriptionPlan,
  UserProfile,
  sortSubscriptionPlans,
} from '../../../../types';
import { useApp } from '../../../../context/AppContext';
import { resolveUserSubscriptionTier } from '../../../../lib/campusService';
import { isSubscriptionExpired as checkUserSubExpired } from '../../../../lib/firebase';
import {
  submitBloggerApplication,
  withdrawBloggerApplication,
} from '../../../../lib/schoolBlogService';
import { PaystackGatewayModal } from '../../../Wallet/PaystackGatewayModal';
import {
  AlertCircle,
  ArrowLeft,
  BookOpen,
  Building2,
  CheckCircle2,
  Clock,
  Coins,
  CreditCard,
  Crown,
  GraduationCap,
  Loader2,
  PenTool,
  Sparkles,
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
  hasActiveSubscription?: boolean;
  isSubscriptionExpired?: boolean;
  onSubscriptionVerified?: () => void;
  onSuccess: (message: string) => void;
}

export const BloggerApplicationModal: React.FC<BloggerApplicationModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  homeInstitutionId,
  homeInstitutionName,
  existingApplication,
  hasActiveSubscription = false,
  isSubscriptionExpired = false,
  onSubscriptionVerified,
  onSuccess,
}) => {
  const {
    subscriptionPlans,
    activeSubscriptionPlans,
    subscribeToPlan,
    isUserSubscribed,
  } = useApp();

  const [reason, setReason] = useState('');
  const [experience, setExperience] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Subscription Gate State (checked ONLY when opening Blogger Application)
  const [subscriptionJustVerified, setSubscriptionJustVerified] = useState(false);
  const [forceSubscriptionStep, setForceSubscriptionStep] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<SubscriptionPlan | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<'CARD' | 'GP'>('CARD');
  const [isUpgrading, setIsUpgrading] = useState(false);
  const [isPaystackOpen, setIsPaystackOpen] = useState(false);
  const [upgradeError, setUpgradeError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) {
      setSelectedPlan(null);
      setIsPaystackOpen(false);
      setUpgradeError(null);
      setError(null);
      setForceSubscriptionStep(false);
      setSubscriptionJustVerified(false);
    }
  }, [isOpen]);

  const paidPlans = useMemo(() => {
    const base =
      activeSubscriptionPlans.length > 0
        ? activeSubscriptionPlans
        : subscriptionPlans.filter(
            (p) =>
              p.active !== false &&
              p.planId !== 'plan_free_scholar' &&
              p.id !== 'plan_free_scholar' &&
              p.priceNaira > 0
          );
    return sortSubscriptionPlans(base);
  }, [activeSubscriptionPlans, subscriptionPlans]);

  const effectiveHasSubscription = useMemo(() => {
    if (subscriptionJustVerified) return true;
    if (forceSubscriptionStep) return false;
    if (!currentUser) return false;
    const isStaff =
      currentUser.role === 'admin' ||
      currentUser.role === 'super_admin' ||
      Boolean(currentUser.isSuperAdmin) ||
      Boolean((currentUser as any).isAdmin) ||
      currentUser.role === 'community_manager';
    if (isStaff || hasActiveSubscription) return true;
    if (isSubscriptionExpired || checkUserSubExpired(currentUser)) return false;
    const tier = resolveUserSubscriptionTier(currentUser);
    return isUserSubscribed || tier === 'premium' || tier === 'vip';
  }, [
    subscriptionJustVerified,
    forceSubscriptionStep,
    currentUser,
    hasActiveSubscription,
    isSubscriptionExpired,
    isUserSubscribed,
  ]);

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

  const hasPending = existingApplication?.status === 'Pending';
  const requiresSubscriptionBeforeApply =
    !effectiveHasSubscription && !hasPending && existingApplication?.status !== 'Approved';

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
      } else if (res.requiresSubscription || res.code === 'SUBSCRIPTION_REQUIRED') {
        setSubscriptionJustVerified(false);
        setForceSubscriptionStep(true);
        setUpgradeError(
          res.error || 'Please subscribe to a Premium or VIP plan before submitting your application.'
        );
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

  const handleCompletePlanSubscription = async (
    plan: SubscriptionPlan,
    method: 'CARD' | 'GP',
    reference?: string
  ) => {
    setIsUpgrading(true);
    setUpgradeError(null);
    try {
      const res = await subscribeToPlan(plan, method, reference);
      if (res.success) {
        setSelectedPlan(null);
        setForceSubscriptionStep(false);
        setSubscriptionJustVerified(true);
        onSubscriptionVerified?.();
      } else {
        setUpgradeError(res.message || 'Could not verify subscription payment. Please try again.');
      }
    } catch (err: any) {
      setUpgradeError(err?.message || 'Subscription verification failed.');
    } finally {
      setIsUpgrading(false);
    }
  };

  const isExpiredAccount = isSubscriptionExpired || checkUserSubExpired(currentUser);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="w-full max-w-2xl bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-7 border border-slate-200 dark:border-slate-800 shadow-2xl space-y-5 max-h-[90vh] overflow-y-auto">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center shrink-0">
              {requiresSubscriptionBeforeApply ? (
                <Crown className="w-5 h-5" />
              ) : (
                <PenTool className="w-5 h-5" />
              )}
            </div>
            <div>
              <h3 className="text-lg font-black text-slate-900 dark:text-white">
                {requiresSubscriptionBeforeApply
                  ? 'Premium or VIP Required to Apply'
                  : 'Apply to Become School Blogger'}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {requiresSubscriptionBeforeApply
                  ? `Subscribe to a Premium or VIP plan to apply as the School Blogger for ${homeInstitutionName}.`
                  : 'Publish official campus news, events, and academic updates for your institution.'}
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

        {/* SUBSCRIPTION STEP — ONLY shown when Free/Expired student clicks Apply to Become a Blogger */}
        {requiresSubscriptionBeforeApply ? (
          <div id="blogger-apply-subscription-gate" className="space-y-4">
            <div className="p-4 rounded-2xl bg-blue-50/80 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800/60 space-y-1.5">
              <div className="text-xs font-black text-blue-800 dark:text-blue-200 flex items-center gap-1.5">
                <Crown className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                <span>
                  {isExpiredAccount
                    ? 'Your Subscription Has Expired'
                    : 'Blogger Eligibility: Active Premium or VIP Subscription'}
                </span>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                Reading School Blogs is free for all students. Applying to become an official Campus
                Blogger and earning GP view rewards requires an active <strong>Premium</strong> or{' '}
                <strong>VIP</strong> subscription. Once your subscription is verified, you will
                immediately continue with your blogger application.
              </p>
            </div>

            {upgradeError && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-400 text-xs font-semibold flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{upgradeError}</span>
              </div>
            )}

            {selectedPlan ? (
              /* Checkout Confirmation for Selected Premium/VIP Plan */
              <div className="rounded-2xl border-2 border-blue-500/50 bg-slate-50/70 dark:bg-slate-800/40 p-5 space-y-4">
                <div className="flex items-center justify-between gap-2">
                  <button
                    type="button"
                    disabled={isUpgrading}
                    onClick={() => {
                      setSelectedPlan(null);
                      setUpgradeError(null);
                    }}
                    className="text-xs font-bold text-slate-600 dark:text-slate-300 hover:text-blue-600 flex items-center gap-1 cursor-pointer"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" />
                    <span>All Plans</span>
                  </button>
                  <span className="px-2.5 py-0.5 rounded-lg bg-blue-600 text-white text-[10px] font-black uppercase tracking-wider">
                    {selectedPlan.targetTier === 'vip' || selectedPlan.tierType === 'vip'
                      ? 'VIP Plan'
                      : 'Premium Plan'}
                  </span>
                </div>

                <div className="flex items-center justify-between gap-4 p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700">
                  <div>
                    <div className="text-sm font-black text-slate-900 dark:text-white">
                      {selectedPlan.name}
                    </div>
                    <div className="text-xs text-slate-500 dark:text-slate-400">
                      {selectedPlan.durationValue} {selectedPlan.durationUnit} access
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-xl font-black text-slate-900 dark:text-white">
                      ₦{selectedPlan.priceNaira.toLocaleString()}
                    </div>
                    <div className="text-[11px] font-bold text-amber-600 dark:text-amber-400">
                      or {selectedPlan.priceNaira.toLocaleString()} GP
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setPaymentMethod('CARD')}
                    className={`p-3 rounded-xl border text-left transition cursor-pointer flex items-start gap-2.5 ${
                      paymentMethod === 'CARD'
                        ? 'border-blue-600 bg-blue-50/70 dark:bg-blue-950/40 ring-2 ring-blue-500/20'
                        : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900'
                    }`}
                  >
                    <CreditCard className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                    <div>
                      <div className="text-xs font-bold text-slate-900 dark:text-white">
                        Debit Card / Bank Transfer
                      </div>
                      <div className="text-[11px] text-slate-500 dark:text-slate-400">
                        Instant Paystack verification
                      </div>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setPaymentMethod('GP')}
                    className={`p-3 rounded-xl border text-left transition cursor-pointer flex items-start gap-2.5 ${
                      paymentMethod === 'GP'
                        ? 'border-blue-600 bg-blue-50/70 dark:bg-blue-950/40 ring-2 ring-blue-500/20'
                        : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900'
                    }`}
                  >
                    <Coins className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                    <div>
                      <div className="text-xs font-bold text-slate-900 dark:text-white">
                        GP Wallet Balance
                      </div>
                      <div className="text-[11px] text-slate-500 dark:text-slate-400">
                        {(currentUser.gpBalance || 0).toLocaleString()} GP available
                      </div>
                    </div>
                  </button>
                </div>

                <div className="flex items-center justify-end gap-2 pt-1">
                  <button
                    type="button"
                    disabled={isUpgrading}
                    onClick={() => setSelectedPlan(null)}
                    className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-200/60 dark:hover:bg-slate-800 cursor-pointer"
                  >
                    Back
                  </button>

                  {paymentMethod === 'CARD' ? (
                    <button
                      type="button"
                      disabled={isUpgrading}
                      onClick={() => {
                        setUpgradeError(null);
                        setIsPaystackOpen(true);
                      }}
                      className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-black flex items-center gap-1.5 cursor-pointer disabled:opacity-60"
                    >
                      {isUpgrading ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          <span>Verifying Subscription...</span>
                        </>
                      ) : (
                        <>
                          <CreditCard className="w-3.5 h-3.5" />
                          <span>Pay ₦{selectedPlan.priceNaira.toLocaleString()} via Paystack</span>
                        </>
                      )}
                    </button>
                  ) : (
                    <button
                      type="button"
                      disabled={isUpgrading || (currentUser.gpBalance || 0) < selectedPlan.priceNaira}
                      onClick={() => handleCompletePlanSubscription(selectedPlan, 'GP')}
                      className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-black flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                    >
                      {isUpgrading ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          <span>Activating...</span>
                        </>
                      ) : (
                        <>
                          <Coins className="w-3.5 h-3.5" />
                          <span>Pay {selectedPlan.priceNaira.toLocaleString()} GP &amp; Continue</span>
                        </>
                      )}
                    </button>
                  )}
                </div>
              </div>
            ) : (
              /* Premium & VIP Plans Grid */
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {paidPlans.map((plan) => {
                  const isVipPlan =
                    plan.targetTier === 'vip' ||
                    plan.tierType === 'vip' ||
                    plan.name.toLowerCase().includes('vip');
                  return (
                    <div
                      key={plan.id || plan.planId}
                      className={`rounded-2xl p-4 border flex flex-col justify-between space-y-4 ${
                        plan.featured
                          ? 'border-blue-500 bg-blue-50/40 dark:bg-blue-950/20 shadow-sm'
                          : isVipPlan
                          ? 'border-amber-400/70 bg-amber-50/30 dark:bg-amber-950/15'
                          : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900'
                      }`}
                    >
                      <div className="space-y-2.5">
                        <div className="flex items-center justify-between gap-1.5">
                          <span
                            className={`px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider ${
                              isVipPlan
                                ? 'bg-amber-500 text-slate-950'
                                : 'bg-blue-600 text-white'
                            }`}
                          >
                            {isVipPlan ? 'VIP' : 'Premium'}
                          </span>
                          <span className="text-[10px] font-semibold text-slate-500 dark:text-slate-400">
                            {plan.durationValue} {plan.durationUnit}
                          </span>
                        </div>

                        <div>
                          <h4 className="text-sm font-black text-slate-900 dark:text-white leading-snug">
                            {plan.name}
                          </h4>
                          <div className="text-xl font-black text-slate-900 dark:text-white mt-1">
                            ₦{plan.priceNaira.toLocaleString()}
                          </div>
                        </div>

                        <ul className="space-y-1.5 text-[11px] text-slate-600 dark:text-slate-300">
                          {plan.benefits.slice(0, 4).map((b, i) => (
                            <li key={i} className="flex items-start gap-1.5">
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0 mt-0.5" />
                              <span className="line-clamp-2">{b}</span>
                            </li>
                          ))}
                        </ul>
                      </div>

                      <button
                        type="button"
                        onClick={() => {
                          setUpgradeError(null);
                          setSelectedPlan(plan);
                        }}
                        className={`w-full py-2.5 rounded-xl text-xs font-black flex items-center justify-center gap-1.5 cursor-pointer transition ${
                          plan.featured
                            ? 'bg-blue-600 hover:bg-blue-700 text-white'
                            : isVipPlan
                            ? 'bg-amber-500 hover:bg-amber-600 text-slate-950'
                            : 'bg-slate-900 hover:bg-slate-800 dark:bg-slate-800 dark:hover:bg-slate-700 text-white'
                        }`}
                      >
                        <Sparkles className="w-3.5 h-3.5" />
                        <span>Subscribe to Apply</span>
                      </button>
                    </div>
                  );
                })}
              </div>
            )}

            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-[11px] text-slate-600 dark:text-slate-300 leading-relaxed">
              <strong>Note:</strong> Blogging opportunities require administrative approval. Only
              approved and active bloggers qualify for GP rewards based on eligible unique article views.
            </div>
          </div>
        ) : (
          /* APPLICATION STEP — Unlocked automatically once Premium/VIP subscription is verified */
          <>
            {subscriptionJustVerified && (
              <div className="p-3.5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 text-xs font-bold flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>
                  Subscription verified! You can now complete and submit your School Blogger application.
                </span>
              </div>
            )}

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
          </>
        )}
      </div>

      {/* Paystack Checkout Modal for inline Premium / VIP activation */}
      {isPaystackOpen && selectedPlan && (
        <PaystackGatewayModal
          plan={selectedPlan}
          userEmail={
            currentUser.email ||
            (currentUser as any).registeredEmail ||
            (currentUser.username?.includes('@')
              ? currentUser.username
              : `${currentUser.username || 'scholar'}@grobaax.org`)
          }
          userId={currentUser.id || 'scholar'}
          userName={applicantName}
          onSuccess={async (reference) => {
            const planToActivate = selectedPlan;
            setIsPaystackOpen(false);
            if (!planToActivate) return;
            await handleCompletePlanSubscription(planToActivate, 'CARD', reference);
          }}
          onClose={() => setIsPaystackOpen(false)}
        />
      )}
    </div>
  );
};
