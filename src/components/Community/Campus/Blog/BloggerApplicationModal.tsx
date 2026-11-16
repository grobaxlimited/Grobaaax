import React, { useEffect, useMemo, useState } from 'react';
import {
  SchoolBloggerAssignment,
  SubscriptionPlan,
  UserProfile,
  sortSubscriptionPlans,
} from '../../../../types';
import { useApp } from '../../../../context/AppContext';
import { resolveUserSubscriptionTier } from '../../../../lib/campusService';
import { isSubscriptionExpired as checkUserSubExpired } from '../../../../lib/firebase';
import { activateSchoolBlogger } from '../../../../lib/schoolBlogService';
import { PaystackGatewayModal } from '../../../Wallet/PaystackGatewayModal';
import {
  AlertCircle,
  ArrowLeft,
  Ban,
  BookOpen,
  Building2,
  CheckCircle2,
  Coins,
  CreditCard,
  Crown,
  Loader2,
  PenTool,
  Sparkles,
  X,
} from 'lucide-react';

interface BloggerApplicationModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: UserProfile;
  homeInstitutionId: string;
  homeInstitutionName: string;
  isSuspendedOrRevoked?: boolean;
  hasActiveSubscription?: boolean;
  isSubscriptionExpired?: boolean;
  onSubscriptionVerified?: () => void;
  onActivated: (assignment: SchoolBloggerAssignment | null, message: string) => void;
}

export const BloggerApplicationModal: React.FC<BloggerApplicationModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  homeInstitutionId,
  homeInstitutionName,
  isSuspendedOrRevoked = false,
  hasActiveSubscription = false,
  isSubscriptionExpired = false,
  onSubscriptionVerified,
  onActivated,
}) => {
  const {
    subscriptionPlans,
    activeSubscriptionPlans,
    subscribeToPlan,
    isUserSubscribed,
  } = useApp();

  const [isActivating, setIsActivating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isRevokedState, setIsRevokedState] = useState(false);

  // Subscription State (checked ONLY when opening Apply to Become a Blogger)
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
      setIsActivating(false);
      setIsRevokedState(false);
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

  const triggerInstantBloggerActivation = async () => {
    setError(null);
    setUpgradeError(null);
    setIsActivating(true);
    try {
      const res = await activateSchoolBlogger({
        targetInstitutionId: homeInstitutionId,
        targetInstitutionName: homeInstitutionName,
      });

      if (res.success) {
        onActivated(
          res.assignment || null,
          res.message ||
            `School Blogger access activated for ${homeInstitutionName}! Opening your Blogger Dashboard.`
        );
        return;
      }

      if (res.revoked || res.code === 'BLOGGER_ACCESS_REVOKED') {
        setIsRevokedState(true);
        setError(
          res.error ||
            `Your School Blogger access for ${homeInstitutionName} has been suspended or revoked by Grobaax Administrators.`
        );
      } else if (res.requiresSubscription || res.code === 'SUBSCRIPTION_REQUIRED') {
        setSubscriptionJustVerified(false);
        setForceSubscriptionStep(true);
        setUpgradeError(
          res.error ||
            'Please subscribe to a Premium or VIP plan to automatically activate your School Blogger Dashboard.'
        );
      } else {
        setError(res.error || 'Could not activate School Blogger access. Please try again.');
      }
    } catch (err: any) {
      setError(err?.message || 'An unexpected error occurred while activating blogger access.');
    } finally {
      setIsActivating(false);
    }
  };

  const handleCompletePlanSubscription = async (
    plan: SubscriptionPlan,
    method: 'CARD' | 'GP',
    reference?: string
  ) => {
    setIsUpgrading(true);
    setUpgradeError(null);
    setError(null);
    try {
      const res = await subscribeToPlan(plan, method, reference);
      if (res.success) {
        setSelectedPlan(null);
        setForceSubscriptionStep(false);
        setSubscriptionJustVerified(true);
        onSubscriptionVerified?.();

        // Automatically activate School Blogger access immediately after payment verification
        await triggerInstantBloggerActivation();
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
  const revokedNotice = isSuspendedOrRevoked || isRevokedState;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="w-full max-w-2xl bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-7 border border-slate-200 dark:border-slate-800 shadow-2xl space-y-5 max-h-[90vh] overflow-y-auto">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center shrink-0">
              {!effectiveHasSubscription ? (
                <Crown className="w-5 h-5" />
              ) : (
                <PenTool className="w-5 h-5" />
              )}
            </div>
            <div>
              <h3 className="text-lg font-black text-slate-900 dark:text-white">
                {revokedNotice
                  ? 'Blogger Access Restricted'
                  : !effectiveHasSubscription
                  ? 'Become a School Blogger'
                  : 'Activate Your Blogger Dashboard'}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {revokedNotice
                  ? `Publishing privileges for ${homeInstitutionName} Blog require administrator review.`
                  : !effectiveHasSubscription
                  ? `Subscribe to Premium or VIP to automatically unlock your ${homeInstitutionName} Blogger Dashboard.`
                  : `Instant Campus Blogger activation for your verified institution (${homeInstitutionName}).`}
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

        {/* Revoked / Suspended Guard */}
        {revokedNotice ? (
          <div className="p-5 rounded-2xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800 space-y-3">
            <div className="flex items-center gap-2 text-rose-700 dark:text-rose-300 text-sm font-black">
              <Ban className="w-5 h-5 shrink-0" />
              <span>School Blogger Access Suspended or Revoked</span>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              {error ||
                `Your School Blogger access for ${homeInstitutionName} was suspended or revoked by Grobaax Administrators. Please contact support or an administrator to restore your publishing access.`}
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
        ) : !effectiveHasSubscription ? (
          /* STEP 1: Display Premium & VIP Plans -> Paystack verification auto-activates blogger access */
          <div id="blogger-apply-subscription-gate" className="space-y-4">
            <div className="p-4 rounded-2xl bg-blue-50/80 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800/60 space-y-1.5">
              <div className="text-xs font-black text-blue-800 dark:text-blue-200 flex items-center gap-1.5">
                <Crown className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                <span>
                  {isExpiredAccount
                    ? 'Your Subscription Has Expired — Renew to Publish'
                    : 'Instant Blogger Activation with Premium or VIP'}
                </span>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                Reading School Blogs is free for everyone. To publish articles for{' '}
                <strong>{homeInstitutionName}</strong> and earn{' '}
                <strong>1,000 GP per 250 eligible unique views</strong>, choose a{' '}
                <strong>Premium</strong> or <strong>VIP</strong> plan below. Once Paystack verifies
                your payment, your Blogger Dashboard opens immediately with no waiting period.
              </p>
            </div>

            {(upgradeError || error) && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-400 text-xs font-semibold flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{upgradeError || error}</span>
              </div>
            )}

            {isActivating && (
              <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 text-xs font-bold flex items-center gap-2.5">
                <Loader2 className="w-4 h-4 animate-spin shrink-0" />
                <span>
                  Subscription verified! Activating your School Blogger Dashboard for {homeInstitutionName}...
                </span>
              </div>
            )}

            {selectedPlan ? (
              <div className="rounded-2xl border-2 border-blue-500/50 bg-slate-50/70 dark:bg-slate-800/40 p-5 space-y-4">
                <div className="flex items-center justify-between gap-2">
                  <button
                    type="button"
                    disabled={isUpgrading || isActivating}
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
                      {selectedPlan.durationValue} {selectedPlan.durationUnit} access · Instant Blogger Activation
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
                    disabled={isUpgrading || isActivating}
                    onClick={() => setSelectedPlan(null)}
                    className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-200/60 dark:hover:bg-slate-800 cursor-pointer"
                  >
                    Back
                  </button>

                  {paymentMethod === 'CARD' ? (
                    <button
                      type="button"
                      disabled={isUpgrading || isActivating}
                      onClick={() => {
                        setUpgradeError(null);
                        setIsPaystackOpen(true);
                      }}
                      className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-black flex items-center gap-1.5 cursor-pointer disabled:opacity-60"
                    >
                      {isUpgrading || isActivating ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          <span>Activating Blogger Access...</span>
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
                      disabled={
                        isUpgrading ||
                        isActivating ||
                        (currentUser.gpBalance || 0) < selectedPlan.priceNaira
                      }
                      onClick={() => handleCompletePlanSubscription(selectedPlan, 'GP')}
                      className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-black flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                    >
                      {isUpgrading || isActivating ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          <span>Activating Blogger Access...</span>
                        </>
                      ) : (
                        <>
                          <Coins className="w-3.5 h-3.5" />
                          <span>Pay {selectedPlan.priceNaira.toLocaleString()} GP &amp; Activate</span>
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
                        <span>Subscribe &amp; Start Blogging</span>
                      </button>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Verified Institution Preview */}
            <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-[11px] text-slate-600 dark:text-slate-300 leading-relaxed flex items-start gap-2">
              <Building2 className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
              <span>
                Your verified Campus profile locks your publishing access to{' '}
                <strong>{homeInstitutionName}</strong>. Articles remain subject to Grobaax community
                moderation standards.
              </span>
            </div>
          </div>
        ) : (
          /* STEP 2: Already Subscribed / Payment Verified — Instant 1-Click Activation into Blogger Dashboard */
          <div id="blogger-instant-activation-panel" className="space-y-4">
            <div className="p-3.5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 text-xs font-bold flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>
                Active Premium/VIP subscription verified! Your account qualifies for instant School Blogger access — no admin review required.
              </span>
            </div>

            {/* Verified Identity Card */}
            <div className="p-4 rounded-2xl bg-blue-50/70 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800/60 space-y-2">
              <div className="text-[11px] font-black uppercase tracking-wider text-blue-700 dark:text-blue-300">
                Verified Campus Identity (Locked to Your Institution)
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                <div>
                  <span className="text-slate-500 dark:text-slate-400">Scholar Name:</span>
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

            <div className="flex items-center justify-end gap-2 pt-1">
              <button
                type="button"
                disabled={isActivating}
                onClick={onClose}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
              >
                Cancel
              </button>
              <button
                id="activate-blogger-dashboard-btn"
                type="button"
                disabled={isActivating}
                onClick={triggerInstantBloggerActivation}
                className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-black shadow-sm flex items-center gap-1.5 cursor-pointer disabled:opacity-60"
              >
                {isActivating ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Activating Blogger Dashboard...</span>
                  </>
                ) : (
                  <>
                    <PenTool className="w-3.5 h-3.5" />
                    <span>Activate &amp; Open Blogger Dashboard</span>
                  </>
                )}
              </button>
            </div>
          </div>
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
