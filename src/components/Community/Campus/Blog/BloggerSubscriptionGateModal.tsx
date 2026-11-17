import React, { useMemo, useState } from 'react';
import { useApp } from '../../../../context/AppContext';
import { SubscriptionPlan, sortSubscriptionPlans } from '../../../../types';
import { PaystackGatewayModal } from '../../../Wallet/PaystackGatewayModal';
import {
  AlertCircle,
  CheckCircle2,
  Coins,
  CreditCard,
  Crown,
  Gem,
  Loader2,
  Lock,
  Sparkles,
  Wallet,
  X,
} from 'lucide-react';

interface BloggerSubscriptionGateModalProps {
  isOpen: boolean;
  onClose: () => void;
  contextMode?: 'apply' | 'post';
  institutionName?: string;
  onSubscribed: () => Promise<void> | void;
}

export const BloggerSubscriptionGateModal: React.FC<BloggerSubscriptionGateModalProps> = ({
  isOpen,
  onClose,
  contextMode = 'apply',
  institutionName,
  onSubscribed,
}) => {
  const {
    currentUser,
    subscriptionPlans,
    activeSubscriptionPlans,
    subscribeToPlan,
    setWalletModalTab,
    setIsWalletModalOpen,
  } = useApp();

  const [selectedPlan, setSelectedPlan] = useState<SubscriptionPlan | null>(null);
  const [isPaystackOpen, setIsPaystackOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{
    success: boolean;
    text: string;
  } | null>(null);

  const paidPlans = useMemo(() => {
    const source = activeSubscriptionPlans.length > 0 ? activeSubscriptionPlans : subscriptionPlans;
    return sortSubscriptionPlans(
      source.filter(
        (p) =>
          p.active !== false &&
          p.planId !== 'plan_free_scholar' &&
          p.id !== 'plan_free_scholar' &&
          Number(p.priceNaira || 0) > 0
      )
    );
  }, [activeSubscriptionPlans, subscriptionPlans]);

  if (!isOpen) return null;

  const isPostMode = contextMode === 'post';

  const handlePayWithGp = async (plan: SubscriptionPlan) => {
    setStatusMessage(null);
    setIsProcessing(true);
    try {
      const res = await subscribeToPlan(plan, 'GP');
      setStatusMessage({ success: res.success, text: res.message });
      if (res.success) {
        await onSubscribed();
      }
    } catch (err: any) {
      setStatusMessage({
        success: false,
        text: err?.message || 'Unable to process GP subscription payment.',
      });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/65 backdrop-blur-xs animate-in fade-in duration-150">
        <div className="w-full max-w-2xl bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-7 border border-slate-200 dark:border-slate-800 shadow-2xl space-y-5 max-h-[90vh] overflow-y-auto">
          {/* Header */}
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-700 text-white flex items-center justify-center shadow-sm shrink-0">
                <Lock className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white">
                  {isPostMode
                    ? 'Subscription Required to Post Articles'
                    : 'Subscribe to Become a School Blogger'}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {institutionName
                    ? `${institutionName} School Blog · `
                    : ''}
                  Reading articles is free for everyone. Subscribe to Premium or VIP to apply and publish.
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

          {statusMessage && (
            <div
              className={`p-3.5 rounded-2xl border text-xs font-bold flex items-start gap-2.5 ${
                statusMessage.success
                  ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-700 dark:text-emerald-300'
                  : 'bg-rose-500/10 border-rose-500/30 text-rose-700 dark:text-rose-300'
              }`}
            >
              {statusMessage.success ? (
                <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
              ) : (
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              )}
              <span>{statusMessage.text}</span>
            </div>
          )}

          {/* Plans Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {paidPlans.map((plan) => {
              const lowerName = `${plan.name} ${plan.planId} ${plan.targetTier || ''}`.toLowerCase();
              const isVip = lowerName.includes('vip') || lowerName.includes('titan');
              const canAffordGp = Number(currentUser.gpBalance || 0) >= Number(plan.priceNaira || 0);

              return (
                <div
                  key={plan.id || plan.planId}
                  className={`p-5 rounded-2xl border flex flex-col justify-between space-y-4 transition-all ${
                    isVip
                      ? 'border-amber-400/70 bg-amber-50/40 dark:bg-amber-950/15'
                      : 'border-blue-500/60 bg-blue-50/40 dark:bg-blue-950/20'
                  }`}
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between gap-2">
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[10px] font-black uppercase ${
                          isVip
                            ? 'bg-amber-500/15 text-amber-700 dark:text-amber-300'
                            : 'bg-blue-600/15 text-blue-700 dark:text-blue-300'
                        }`}
                      >
                        {isVip ? <Crown className="w-3 h-3" /> : <Gem className="w-3 h-3" />}
                        <span>{isVip ? 'VIP Tier' : 'Premium Tier'}</span>
                      </span>
                      <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400">
                        {plan.durationValue} {plan.durationUnit}
                      </span>
                    </div>

                    <div>
                      <h4 className="text-base sm:text-lg font-black text-slate-900 dark:text-white">
                        {plan.name}
                      </h4>
                      <div className="text-2xl font-black text-slate-900 dark:text-white mt-0.5 tabular-nums">
                        ₦{Number(plan.priceNaira || 0).toLocaleString()}
                      </div>
                      {plan.shortDescription && (
                        <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                          {plan.shortDescription}
                        </p>
                      )}
                    </div>

                    <div className="space-y-1.5 pt-1">
                      {(plan.benefits || []).slice(0, 4).map((benefit, idx) => (
                        <div
                          key={idx}
                          className="flex items-start gap-2 text-xs text-slate-700 dark:text-slate-300"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0 mt-0.5" />
                          <span>{benefit}</span>
                        </div>
                      ))}
                      <div className="flex items-start gap-2 text-xs font-bold text-slate-800 dark:text-slate-200">
                        <Sparkles className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
                        <span>Apply & post School Blog articles</span>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2 pt-2 border-t border-slate-200/70 dark:border-slate-800">
                    <button
                      type="button"
                      disabled={isProcessing}
                      onClick={() => {
                        setStatusMessage(null);
                        setSelectedPlan(plan);
                        setIsPaystackOpen(true);
                      }}
                      className="w-full py-2.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-black flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-60"
                    >
                      <CreditCard className="w-3.5 h-3.5" />
                      <span>Subscribe ₦{Number(plan.priceNaira || 0).toLocaleString()} via Paystack</span>
                    </button>

                    {canAffordGp && (
                      <button
                        type="button"
                        disabled={isProcessing}
                        onClick={() => handlePayWithGp(plan)}
                        className="w-full py-2 px-4 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 text-amber-800 dark:text-amber-300 border border-amber-500/30 text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-60"
                      >
                        {isProcessing ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <Coins className="w-3.5 h-3.5" />
                        )}
                        <span>Pay {Number(plan.priceNaira || 0).toLocaleString()} GP</span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2 flex-wrap">
            <button
              type="button"
              onClick={() => {
                onClose();
                setWalletModalTab('upgrade');
                setIsWalletModalOpen(true);
              }}
              className="text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1.5 cursor-pointer"
            >
              <Wallet className="w-3.5 h-3.5" />
              <span>View Full Subscription Details in Wallet</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>

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
          userName={currentUser.name || currentUser.fullName || 'Scholar'}
          onSuccess={async (reference) => {
            const planToUpgrade = selectedPlan;
            setIsPaystackOpen(false);
            if (!planToUpgrade) return;
            setIsProcessing(true);
            try {
              const res = await subscribeToPlan(planToUpgrade, 'CARD', reference);
              setStatusMessage({ success: res.success, text: res.message });
              if (res.success) {
                await onSubscribed();
              }
            } finally {
              setIsProcessing(false);
            }
          }}
          onClose={() => setIsPaystackOpen(false)}
        />
      )}
    </>
  );
};
