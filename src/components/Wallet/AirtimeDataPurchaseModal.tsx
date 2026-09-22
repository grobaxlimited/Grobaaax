import React, { useState, useEffect, useId } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useApp, resolveUserSubscriptionStatus } from '../../context/AppContext';
import {
  VtuNetwork,
  VtuServiceType,
  AirtimeDataSettings,
  AirtimeDataProduct,
  AirtimeDataTransaction,
  DEFAULT_AIRTIME_DATA_SETTINGS,
  DEFAULT_NIGERIAN_DATA_BUNDLES,
  NETWORK_METADATA,
  validateNigerianPhone,
} from '../../lib/vtuTypes';
import { vtuClient } from '../../lib/vtuClient';
import {
  subscribeToUserVtuTransactions,
  saveVtuTransactionToFirestore,
  updateVtuTransactionInFirestore,
} from '../../lib/vtuFirebase';
import { deductUserGpInFirestore, refundUserGpInFirestore } from '../../lib/firebase';
import {
  Smartphone,
  Wifi,
  Zap,
  CheckCircle2,
  AlertCircle,
  Clock,
  ChevronRight,
  ArrowRight,
  ShieldCheck,
  RefreshCw,
  Coins,
  History,
  Copy,
  Check,
  Phone,
  Layers,
  Sparkles,
  Info,
  X,
  Search,
  Tag,
  SlidersHorizontal,
  Lock,
} from 'lucide-react';

interface AirtimeDataPurchaseModalProps {
  onClose?: () => void;
  onNavigateToTab?: (tab: string) => void;
}

export function AirtimeDataPurchaseModal({ onClose, onNavigateToTab }: AirtimeDataPurchaseModalProps) {
  const { currentUser, firebaseUser, setCurrentUser, addNotification, addTransaction } = useApp();
  const baseId = useId();

  const subscriptionStatus = resolveUserSubscriptionStatus(currentUser);

  // Settings & Plans state
  const [settings, setSettings] = useState<AirtimeDataSettings>(DEFAULT_AIRTIME_DATA_SETTINGS);
  const [dataPlans, setDataPlans] = useState<AirtimeDataProduct[]>(DEFAULT_NIGERIAN_DATA_BUNDLES);
  const [isLoadingPlans, setIsLoadingPlans] = useState(false);

  // Form State
  const [serviceType, setServiceType] = useState<VtuServiceType>('airtime');
  const [selectedNetwork, setSelectedNetwork] = useState<VtuNetwork>('MTN');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [planSearchQuery, setPlanSearchQuery] = useState<string>('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [airtimeAmount, setAirtimeAmount] = useState<number>(500);
  const [customAmountStr, setCustomAmountStr] = useState<string>('');
  const [selectedPlan, setSelectedPlan] = useState<AirtimeDataProduct | null>(null);

  // Active view inside component
  const [activeSubTab, setActiveSubTab] = useState<'purchase' | 'history'>('purchase');

  // Flow State
  const [step, setStep] = useState<'form' | 'confirm' | 'processing' | 'result'>('form');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [resultState, setResultState] = useState<{
    status: 'SUCCESS' | 'PENDING' | 'FAILED';
    message: string;
    transaction?: AirtimeDataTransaction;
    refunded?: boolean;
    refundedGp?: number;
  } | null>(null);

  // User's Transactions history
  const [userTransactions, setUserTransactions] = useState<AirtimeDataTransaction[]>([]);
  const [copiedTxId, setCopiedTxId] = useState<string | null>(null);
  const [selectedTxDetail, setSelectedTxDetail] = useState<AirtimeDataTransaction | null>(null);
  const [requeryingTxId, setRequeryingTxId] = useState<string | null>(null);

  // Re-query and auto-refund handler for transactions
  const handleRequeryTransaction = async (tx: AirtimeDataTransaction) => {
    const txId = tx.transactionId || tx.id;
    if (!txId || requeryingTxId) return;

    setRequeryingTxId(txId);
    try {
      const res = await vtuClient.requery(txId);
      const targetUserId = firebaseUser?.uid || currentUser.id || (currentUser as any).uid || 'scholar';

      if (res.status === 'SUCCESS') {
        await updateVtuTransactionInFirestore(txId, {
          status: 'SUCCESS',
          completedAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });
        if (addNotification) {
          addNotification({
            title: 'Telecom Top-up Confirmed',
            message: `Your ${tx.network} ${tx.serviceType === 'airtime' ? 'Airtime' : 'Data'} (₦${tx.amountNGN.toLocaleString()}) to ${tx.phoneNumber} was confirmed successful!`,
            type: 'wallet',
          });
        }
      } else if (res.status === 'FAILED' || (res.status as string) === 'REFUNDED') {
        // Execute automatic refund into Firestore wallet
        const refundRes = await refundUserGpInFirestore(targetUserId, tx.gpAmount, {
          originalTransactionId: txId,
          reason: res.message || 'Telecom delivery unfulfilled',
          title: `Refund: ${tx.network} ${tx.serviceType === 'airtime' ? 'Airtime' : 'Data'} (+${tx.gpAmount} GP)`,
          description: `Automatic refund for failed recharge to ${tx.phoneNumber}`,
          userName: currentUser.name,
          userEmail: currentUser.email,
        });

        if (refundRes.success) {
          setCurrentUser(prev => ({
            ...prev,
            gpBalance: refundRes.newBalance,
          }));
        }

        await updateVtuTransactionInFirestore(txId, {
          status: 'FAILED',
          refundStatus: 'REFUNDED',
          failureReason: res.message || 'Operator rejected order',
          updatedAt: new Date().toISOString(),
        });

        if (addNotification) {
          addNotification({
            title: 'Recharge Failed — GP Refunded',
            message: `Network operator could not complete delivery. ${tx.gpAmount} GP has been refunded to your wallet.`,
            type: 'wallet',
          });
        }
      }
    } catch (err) {
      console.warn('Requery error:', err);
    } finally {
      setRequeryingTxId(null);
    }
  };

  // Load Settings and Plans
  useEffect(() => {
    let isMounted = true;
    async function loadData() {
      setIsLoadingPlans(true);
      try {
        const fetchedSettings = await vtuClient.getSettings();
        if (isMounted) setSettings(fetchedSettings);

        const fetchedPlans = await vtuClient.getDataPlans(selectedNetwork);
        if (isMounted) {
          setDataPlans(fetchedPlans);
          if (fetchedPlans.length > 0) {
            setSelectedPlan((prev) => (!prev || prev.network !== selectedNetwork ? fetchedPlans[0] : prev));
          }
        }
      } catch (err) {
        console.warn('Error loading VTU data:', err);
      } finally {
        if (isMounted) setIsLoadingPlans(false);
      }
    }
    loadData();
    return () => {
      isMounted = false;
    };
  }, [selectedNetwork]);

  // Real-time Firestore Transactions Listener
  useEffect(() => {
    if (!currentUser?.id) return;
    const unsubscribe = subscribeToUserVtuTransactions(currentUser.id, (txs) => {
      setUserTransactions(txs);
    });
    return () => {
      unsubscribe();
    };
  }, [currentUser?.id]);

  // Derived available categories for selected network
  const availableCategories = React.useMemo(() => {
    const cats = ['ALL'];
    const seen = new Set<string>();
    dataPlans.forEach(p => {
      const c = (p.category || p.planType || '').toUpperCase();
      if (c && !seen.has(c)) {
        seen.add(c);
        cats.push(c);
      }
    });
    return cats;
  }, [dataPlans]);

  // Filtered plans based on category & search query
  const filteredPlans = React.useMemo(() => {
    return dataPlans.filter(plan => {
      const planCat = (plan.category || plan.planType || '').toUpperCase();
      const matchesCategory = selectedCategory === 'ALL' || planCat === selectedCategory.toUpperCase();

      const query = planSearchQuery.trim().toLowerCase();
      if (!matchesCategory) return false;
      if (!query) return true;

      return (
        (plan.productName && plan.productName.toLowerCase().includes(query)) ||
        (plan.dataVolume && plan.dataVolume.toLowerCase().includes(query)) ||
        (plan.productCode && plan.productCode.toLowerCase().includes(query)) ||
        (plan.validity && plan.validity.toLowerCase().includes(query)) ||
        planCat.toLowerCase().includes(query)
      );
    });
  }, [dataPlans, selectedCategory, planSearchQuery]);

  // Phone Validation and Network Auto-detection
  const phoneValidation = validateNigerianPhone(phoneNumber);

  const handlePhoneChange = (val: string) => {
    setPhoneNumber(val);
    const check = validateNigerianPhone(val);
    if (check.isValid && check.detectedNetwork && check.detectedNetwork !== selectedNetwork) {
      setSelectedNetwork(check.detectedNetwork);
    }
  };

  // Preset Airtime Amounts
  const presetAirtimeAmounts = [100, 200, 500, 1000, 2000, 5000];

  const currentEffectiveAmount = serviceType === 'airtime'
    ? (customAmountStr ? Number(customAmountStr) || 0 : airtimeAmount)
    : (selectedPlan?.amountNGN || 0);

  const rate = settings.gpToNgnRate > 0 ? settings.gpToNgnRate : 1.0;
  const requiredGp = Math.ceil(currentEffectiveAmount / rate);
  const userGpBalance = currentUser?.gpBalance || 0;
  const hasEnoughGp = userGpBalance >= requiredGp;
  const remainingGp = userGpBalance - requiredGp;

  // Handle Quick Copy
  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedTxId(text);
    setTimeout(() => setCopiedTxId(null), 2000);
  };

  // Execute Purchase
  const handleExecutePurchase = async () => {
    if (!hasEnoughGp || isSubmitting || currentEffectiveAmount <= 0) return;

    if (!phoneValidation.isValid) {
      alert('Please enter a valid 11-digit Nigerian phone number.');
      return;
    }

    setIsSubmitting(true);
    setStep('processing');

    const targetUserId = firebaseUser?.uid || currentUser.id || (currentUser as any).uid || 'scholar';
    const idempotencyKey = `idemp_${targetUserId}_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

    // 1. Optimistically deduct GP from local user profile
    const previousGp = currentUser.gpBalance;
    setCurrentUser(prev => ({
      ...prev,
      gpBalance: Math.max(0, prev.gpBalance - requiredGp),
    }));

    try {
      const response = await vtuClient.purchase({
        userId: targetUserId,
        userName: currentUser.name || currentUser.username || 'Scholar',
        userEmail: currentUser.email,
        userAvatar: currentUser.avatar,
        serviceType,
        network: selectedNetwork,
        phoneNumber: phoneValidation.formattedNumber,
        amountNGN: currentEffectiveAmount,
        gpAmount: requiredGp,
        productCode: serviceType === 'data' ? selectedPlan?.productCode : undefined,
        productName: serviceType === 'data' ? selectedPlan?.productName : `${selectedNetwork} ₦${currentEffectiveAmount.toLocaleString()} Airtime`,
        idempotencyKey,
        membershipTier: currentUser.membershipTier,
        subscriptionTier: currentUser.subscriptionTier,
        isPremium: subscriptionStatus.isPremium,
        userRole: currentUser.role,
        userPlan: subscriptionStatus.effectiveTier,
      });

      if (response.success && response.status === 'SUCCESS') {
        // Save to Firestore transaction log
        if (response.transaction) {
          await saveVtuTransactionToFirestore(response.transaction);
        }

        // Persist GP deduction in Firestore user document
        const deductResult = await deductUserGpInFirestore(targetUserId, requiredGp, {
          type: 'vtu_purchase',
          title: `${selectedNetwork} ${serviceType === 'airtime' ? 'Airtime' : 'Data'} Top-up`,
          description: `₦${currentEffectiveAmount.toLocaleString()} ${serviceType === 'airtime' ? 'airtime' : 'mobile data'} to ${phoneValidation.formattedNumber}`,
          skipTransactionDoc: true,
          meta: {
            serviceType,
            network: selectedNetwork,
            phoneNumber: phoneValidation.formattedNumber,
            amountNGN: currentEffectiveAmount,
            gpAmount: requiredGp,
            transactionId: response.transaction?.transactionId || response.transaction?.id,
          },
        });

        if (deductResult.success) {
          setCurrentUser(prev => ({
            ...prev,
            gpBalance: deductResult.newBalance,
          }));
        }

        // Record in app wallet transactions
        if (addTransaction) {
          addTransaction({
            type: 'vtu_purchase',
            amount: requiredGp,
            unit: 'GP',
            title: `${selectedNetwork} ${serviceType === 'airtime' ? 'Airtime' : 'Data'} Top-up`,
            description: `₦${currentEffectiveAmount.toLocaleString()} ${serviceType === 'airtime' ? 'airtime' : 'mobile data'} to ${phoneValidation.formattedNumber}`,
            isCredit: false,
          });
        }

        setResultState({
          status: 'SUCCESS',
          message: response.message || `Successfully purchased ${serviceType === 'airtime' ? 'airtime' : 'mobile data'}!`,
          transaction: response.transaction,
        });

        // Add in-app notification
        if (addNotification) {
          addNotification({
            title: `${selectedNetwork} Recharge Successful`,
            message: `₦${currentEffectiveAmount.toLocaleString()} ${serviceType === 'airtime' ? 'airtime' : 'mobile data'} delivered to ${phoneValidation.formattedNumber}. Redeemed with ${requiredGp} GP.`,
            type: 'wallet',
          });
        }
      } else if (response.status === 'PENDING') {
        if (response.transaction) {
          await saveVtuTransactionToFirestore(response.transaction);
        }

        // Deduct GP in Firestore for pending transaction as well
        const deductResult = await deductUserGpInFirestore(targetUserId, requiredGp, {
          type: 'vtu_purchase',
          title: `${selectedNetwork} ${serviceType === 'airtime' ? 'Airtime' : 'Data'} (Pending)`,
          description: `₦${currentEffectiveAmount.toLocaleString()} ${serviceType === 'airtime' ? 'airtime' : 'mobile data'} to ${phoneValidation.formattedNumber}`,
          skipTransactionDoc: true,
        });

        if (deductResult.success) {
          setCurrentUser(prev => ({
            ...prev,
            gpBalance: deductResult.newBalance,
          }));
        }

        if (addTransaction) {
          addTransaction({
            type: 'vtu_purchase',
            amount: requiredGp,
            unit: 'GP',
            title: `${selectedNetwork} ${serviceType === 'airtime' ? 'Airtime' : 'Data'} (Pending)`,
            description: `₦${currentEffectiveAmount.toLocaleString()} ${serviceType === 'airtime' ? 'airtime' : 'mobile data'} to ${phoneValidation.formattedNumber}`,
            isCredit: false,
          });
        }

        setResultState({
          status: 'PENDING',
          message: response.message || 'Transaction is processing with telecom operator.',
          transaction: response.transaction,
        });
      } else {
        // Failed - Restore GP
        setCurrentUser(prev => ({
          ...prev,
          gpBalance: previousGp,
        }));

        setResultState({
          status: 'FAILED',
          message: response.message || 'Recharge failed. Your GP balance has been fully refunded.',
          transaction: response.transaction,
          refunded: true,
          refundedGp: requiredGp,
        });
      }
    } catch (err: any) {
      // Restore GP on network crash
      setCurrentUser(prev => ({
        ...prev,
        gpBalance: previousGp,
      }));

      setResultState({
        status: 'FAILED',
        message: 'A connection error occurred while contacting the telecom server. Your GP balance remains untouched.',
        refunded: true,
        refundedGp: requiredGp,
      });
    } finally {
      setIsSubmitting(false);
      setStep('result');
    }
  };

  return (
    <div id={`${baseId}-airtime-container`} className="space-y-6">
      {/* Header Tabs: Purchase vs Transaction History */}
      <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
        <div className="flex items-center space-x-2">
          <div className="p-2 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400">
            <Smartphone className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              Airtime & Mobile Data
              <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                GP Redeem
              </span>
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Convert your Grobaax GP balance to instant Nigerian airtime & data
            </p>
          </div>
        </div>

        {/* View Switcher */}
        <div className="flex items-center bg-slate-100 dark:bg-slate-800/80 p-1 rounded-xl border border-slate-200 dark:border-slate-700">
          <button
            id={`${baseId}-tab-purchase`}
            onClick={() => {
              setActiveSubTab('purchase');
              setStep('form');
            }}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
              activeSubTab === 'purchase'
                ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Zap className="w-3.5 h-3.5" />
            Buy Now
          </button>
          <button
            id={`${baseId}-tab-history`}
            onClick={() => setActiveSubTab('history')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
              activeSubTab === 'history'
                ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <History className="w-3.5 h-3.5" />
            My Purchases ({userTransactions.length})
          </button>
        </div>
      </div>

      {activeSubTab === 'purchase' ? (
        <>
          {step === 'form' && (
            <div className="space-y-6">
              {/* Service Type Switcher: Airtime vs Data */}
              <div className="grid grid-cols-2 gap-3">
                <button
                  id={`${baseId}-service-airtime`}
                  onClick={() => setServiceType('airtime')}
                  className={`p-3.5 rounded-2xl border text-left transition flex items-center gap-3 ${
                    serviceType === 'airtime'
                      ? 'border-blue-600 bg-blue-50/50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 ring-2 ring-blue-500/20'
                      : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 text-slate-600 dark:text-slate-400 hover:border-slate-300 dark:hover:border-slate-700'
                  }`}
                >
                  <div className={`p-2.5 rounded-xl ${serviceType === 'airtime' ? 'bg-blue-600 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-500'}`}>
                    <Phone className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-slate-900 dark:text-white">Airtime Top-up</h4>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">Recharge any Nigerian network</p>
                  </div>
                </button>

                <button
                  id={`${baseId}-service-data`}
                  onClick={() => setServiceType('data')}
                  className={`p-3.5 rounded-2xl border text-left transition flex items-center gap-3 ${
                    serviceType === 'data'
                      ? 'border-indigo-600 bg-indigo-50/50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 ring-2 ring-indigo-500/20'
                      : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 text-slate-600 dark:text-slate-400 hover:border-slate-300 dark:hover:border-slate-700'
                  }`}
                >
                  <div className={`p-2.5 rounded-xl ${serviceType === 'data' ? 'bg-indigo-600 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-500'}`}>
                    <Wifi className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-slate-900 dark:text-white">Mobile Data Bundle</h4>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">SME & Direct internet bundles</p>
                  </div>
                </button>
              </div>

              {/* Network Selector */}
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  1. Select Telecom Network
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  {(['MTN', 'AIRTEL', 'GLO', '9MOBILE'] as VtuNetwork[]).map((net) => {
                    const meta = NETWORK_METADATA[net];
                    const isSelected = selectedNetwork === net;
                    const isEnabled =
                      (net === 'MTN' && settings.mtnEnabled) ||
                      (net === 'AIRTEL' && settings.airtelEnabled) ||
                      (net === 'GLO' && settings.gloEnabled) ||
                      (net === '9MOBILE' && settings.nineMobileEnabled);

                    return (
                      <button
                        key={net}
                        id={`${baseId}-network-${net}`}
                        disabled={!isEnabled}
                        onClick={() => setSelectedNetwork(net)}
                        className={`p-3 rounded-xl border text-center transition relative ${
                          isSelected
                            ? `${meta.borderColor} ${meta.bgColor} ring-2 ring-offset-1 ring-blue-500`
                            : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-slate-300'
                        } ${!isEnabled ? 'opacity-40 cursor-not-allowed' : ''}`}
                      >
                        <div className="text-xs font-extrabold text-slate-900 dark:text-white flex items-center justify-center gap-1.5">
                          {meta.logoBadge}
                        </div>
                        <span className="text-[10px] text-slate-500 dark:text-slate-400 block mt-0.5">
                          {isEnabled ? 'Available' : 'Offline'}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Phone Number Input */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    2. Recipient Phone Number
                  </label>
                  {phoneValidation.isValid && phoneValidation.detectedNetwork && (
                    <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Detected: {NETWORK_METADATA[phoneValidation.detectedNetwork].name}
                    </span>
                  )}
                </div>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <Phone className="w-4 h-4" />
                  </div>
                  <input
                    id={`${baseId}-input-phone`}
                    type="tel"
                    placeholder="e.g. 08012345678 or 09012345678"
                    value={phoneNumber}
                    onChange={(e) => handlePhoneChange(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-sm font-medium text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                {phoneNumber && !phoneValidation.isValid && (
                  <p className="text-xs text-rose-500 flex items-center gap-1">
                    <AlertCircle className="w-3.5 h-3.5" />
                    {phoneValidation.error}
                  </p>
                )}
              </div>

              {/* Airtime Amount Selection vs Data Bundle Selector */}
              {serviceType === 'airtime' ? (
                <div className="space-y-3">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    3. Select or Enter Airtime Amount (₦)
                  </label>

                  {/* Preset Chips */}
                  <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                    {presetAirtimeAmounts.map((amt) => {
                      const isSelected = !customAmountStr && airtimeAmount === amt;
                      return (
                        <button
                          key={amt}
                          id={`${baseId}-chip-amount-${amt}`}
                          onClick={() => {
                            setAirtimeAmount(amt);
                            setCustomAmountStr('');
                          }}
                          className={`py-2 px-3 rounded-xl border text-xs font-bold transition ${
                            isSelected
                              ? 'border-blue-600 bg-blue-600 text-white'
                              : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:border-slate-300'
                          }`}
                        >
                          ₦{amt.toLocaleString()}
                        </button>
                      );
                    })}
                  </div>

                  {/* Custom Amount Input */}
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400 text-sm font-bold">
                      ₦
                    </div>
                    <input
                      id={`${baseId}-input-custom-amount`}
                      type="number"
                      placeholder={`Custom amount (Min ₦${settings.minAirtimeNGN} - Max ₦${settings.maxAirtimeNGN})`}
                      value={customAmountStr}
                      onChange={(e) => {
                        setCustomAmountStr(e.target.value);
                      }}
                      className="w-full pl-8 pr-4 py-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs font-medium text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
              ) : (
                /* Data Plans Selector */
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                      3. Select {selectedNetwork} Data Bundle
                    </label>
                    <span className="text-xs text-slate-500 dark:text-slate-400">
                      {filteredPlans.length} of {dataPlans.length} bundles
                    </span>
                  </div>

                  {/* Category / Plan Type Filter Tabs */}
                  {availableCategories.length > 1 && (
                    <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
                      {availableCategories.map((cat) => {
                        const isSelected = selectedCategory.toUpperCase() === cat.toUpperCase();
                        let displayLabel = cat;
                        if (cat === 'ALL') displayLabel = 'All Types';
                        else if (cat === 'CG') displayLabel = 'Corporate (CG)';
                        else if (cat === 'SME') displayLabel = 'SME';
                        else if (cat === 'AWOOF') displayLabel = 'Awoof';
                        else if (cat === 'GIFTING') displayLabel = 'Gifting';

                        const count = cat === 'ALL'
                          ? dataPlans.length
                          : dataPlans.filter(p => (p.category || p.planType || '').toUpperCase() === cat.toUpperCase()).length;

                        return (
                          <button
                            key={cat}
                            id={`${baseId}-cat-filter-${cat.toLowerCase()}`}
                            type="button"
                            onClick={() => {
                              setSelectedCategory(cat);
                              const matches = dataPlans.filter(
                                p => cat === 'ALL' || (p.category || p.planType || '').toUpperCase() === cat.toUpperCase()
                              );
                              if (matches.length > 0) {
                                setSelectedPlan(matches[0]);
                              }
                            }}
                            className={`px-2.5 py-1 rounded-lg text-xs font-semibold whitespace-nowrap transition flex items-center gap-1.5 shrink-0 ${
                              isSelected
                                ? 'bg-blue-600 text-white shadow-xs'
                                : 'bg-slate-100 dark:bg-slate-800/80 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                            }`}
                          >
                            <span>{displayLabel}</span>
                            <span
                              className={`px-1.5 py-0.2 rounded-full text-[9px] font-bold ${
                                isSelected
                                  ? 'bg-blue-700 text-white'
                                  : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                              }`}
                            >
                              {count}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  )}

                  {/* Search Bar for Quick Bundle Lookup */}
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                      <Search className="w-3.5 h-3.5" />
                    </div>
                    <input
                      id={`${baseId}-input-search-plans`}
                      type="text"
                      placeholder="Search bundle (e.g. 1GB, 2GB, 5GB, 10GB, Awoof)..."
                      value={planSearchQuery}
                      onChange={(e) => setPlanSearchQuery(e.target.value)}
                      className="w-full pl-8.5 pr-8 py-2 rounded-xl bg-slate-50 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 text-xs font-medium text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    {planSearchQuery && (
                      <button
                        type="button"
                        onClick={() => setPlanSearchQuery('')}
                        className="absolute inset-y-0 right-0 pr-2.5 flex items-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>

                  {isLoadingPlans ? (
                    <div className="p-8 text-center text-xs text-slate-400 flex items-center justify-center gap-2">
                      <RefreshCw className="w-4 h-4 animate-spin text-blue-500" />
                      Loading live bundles...
                    </div>
                  ) : filteredPlans.length === 0 ? (
                    <div className="p-6 text-center text-xs text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-dashed border-slate-200 dark:border-slate-800 space-y-2">
                      <p>No data plans matching your search or category.</p>
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedCategory('ALL');
                          setPlanSearchQuery('');
                        }}
                        className="text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline"
                      >
                        Reset filters and show all
                      </button>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-60 overflow-y-auto pr-1">
                      {filteredPlans.map((plan) => {
                        const isSelected = selectedPlan?.id === plan.id;
                        const planGp = Math.ceil(plan.amountNGN / rate);

                        return (
                          <button
                            key={plan.id}
                            id={`${baseId}-plan-${plan.id}`}
                            onClick={() => setSelectedPlan(plan)}
                            className={`p-3 rounded-xl border text-left transition flex items-center justify-between ${
                              isSelected
                                ? 'border-indigo-600 bg-indigo-50/50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-300 ring-2 ring-indigo-500/20'
                                : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:border-slate-300'
                            }`}
                          >
                            <div className="space-y-0.5">
                              <div className="flex items-center gap-1.5">
                                <span className="text-xs font-bold text-slate-900 dark:text-white">
                                  {plan.dataVolume || plan.productName}
                                </span>
                                {plan.category && (
                                  <span className="px-1.5 py-0.2 rounded text-[9px] font-extrabold bg-blue-500/10 text-blue-600 dark:text-blue-400">
                                    {plan.category}
                                  </span>
                                )}
                              </div>
                              <p className="text-[10px] text-slate-500 dark:text-slate-400">
                                Validity: {plan.validity || '30 Days'} • ID #{plan.productCode}
                              </p>
                            </div>

                            <div className="text-right">
                              <div className="text-xs font-extrabold text-slate-900 dark:text-white">
                                ₦{plan.amountNGN.toLocaleString()}
                              </div>
                              <span className="text-[10px] font-bold text-amber-500 flex items-center justify-end gap-0.5">
                                <Coins className="w-3 h-3" />
                                {planGp.toLocaleString()} GP
                              </span>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* Authoritative GP Summary Box */}
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 space-y-3">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-500 dark:text-slate-400">Your Current GP Balance:</span>
                  <span className="font-bold text-slate-900 dark:text-white flex items-center gap-1">
                    <Coins className="w-3.5 h-3.5 text-amber-500" />
                    {userGpBalance.toLocaleString()} GP
                  </span>
                </div>

                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-500 dark:text-slate-400">Conversion Rate:</span>
                  <span className="font-semibold text-slate-700 dark:text-slate-300">
                    1 GP = ₦{rate} NGN
                  </span>
                </div>

                <div className="flex items-center justify-between text-xs border-t border-slate-200 dark:border-slate-800 pt-2 font-bold">
                  <span className="text-slate-900 dark:text-white">Required GP to Deduct:</span>
                  <span className="text-sm text-blue-600 dark:text-blue-400 flex items-center gap-1">
                    <Coins className="w-4 h-4 text-amber-500" />
                    {requiredGp.toLocaleString()} GP
                  </span>
                </div>

                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-500 dark:text-slate-400">Remaining Balance After:</span>
                  <span className={`font-bold ${hasEnoughGp ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-500'}`}>
                    {hasEnoughGp ? `${remainingGp.toLocaleString()} GP` : 'Insufficient GP'}
                  </span>
                </div>
              </div>

              {/* Error Notice if low GP balance */}
              {!hasEnoughGp && (
                <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>
                    You need <strong>{(requiredGp - userGpBalance).toLocaleString()} more GP</strong> to complete this purchase. Participate in quizzes, league matches, or GUS tournaments to earn more GP!
                  </span>
                </div>
              )}

              {/* Review & Proceed Button */}
              <button
                id={`${baseId}-btn-proceed-confirm`}
                disabled={!hasEnoughGp || !phoneValidation.isValid || currentEffectiveAmount <= 0}
                onClick={() => setStep('confirm')}
                className="w-full py-3.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-sm transition shadow-sm disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2 cursor-pointer"
              >
                <span>Review & Confirm Purchase</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Confirm Step */}
          {step === 'confirm' && (
            <div className="space-y-6">
              <div className="text-center space-y-1">
                <div className="w-12 h-12 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 mx-auto flex items-center justify-center">
                  <ShieldCheck className="w-6 h-6" />
                </div>
                <h4 className="text-base font-bold text-slate-900 dark:text-white">Confirm Telecom Recharge</h4>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Please verify your order details before authorizing GP deduction
                </p>
              </div>

              {/* Order Breakdown */}
              <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-3">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-500">Service:</span>
                  <span className="font-bold text-slate-900 dark:text-white uppercase">
                    {serviceType === 'airtime' ? 'Airtime Top-up' : 'Mobile Data Bundle'}
                  </span>
                </div>

                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-500">Network:</span>
                  <span className="font-bold text-slate-900 dark:text-white">
                    {NETWORK_METADATA[selectedNetwork].name}
                  </span>
                </div>

                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-500">Recipient Phone:</span>
                  <span className="font-mono font-bold text-slate-900 dark:text-white">
                    {phoneValidation.formattedNumber}
                  </span>
                </div>

                {serviceType === 'data' && selectedPlan && (
                  <>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-500">Data Package:</span>
                      <span className="font-bold text-blue-600 dark:text-blue-400">
                        {selectedPlan.dataVolume || selectedPlan.productName} ({selectedPlan.validity || '30 Days'})
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-500">Plan Type & ID:</span>
                      <span className="font-mono text-[11px] font-semibold text-slate-700 dark:text-slate-300">
                        {(selectedPlan.category || selectedPlan.planType || 'DATA').toUpperCase()} (ID #{selectedPlan.productCode})
                      </span>
                    </div>
                  </>
                )}

                <div className="flex items-center justify-between text-xs border-t border-slate-100 dark:border-slate-800 pt-2">
                  <span className="text-slate-500">Fulfillment Value:</span>
                  <span className="font-extrabold text-slate-900 dark:text-white">
                    ₦{currentEffectiveAmount.toLocaleString()} NGN
                  </span>
                </div>

                <div className="flex items-center justify-between text-xs font-bold border-t border-slate-100 dark:border-slate-800 pt-2">
                  <span className="text-slate-900 dark:text-white">GP Deduction:</span>
                  <span className="text-sm text-blue-600 dark:text-blue-400 flex items-center gap-1">
                    <Coins className="w-4 h-4 text-amber-500" />
                    -{requiredGp.toLocaleString()} GP
                  </span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="grid grid-cols-2 gap-3">
                <button
                  id={`${baseId}-btn-back-edit`}
                  onClick={() => setStep('form')}
                  className="py-3 px-4 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition"
                >
                  Edit Details
                </button>

                <button
                  id={`${baseId}-btn-pay-now`}
                  onClick={handleExecutePurchase}
                  className="py-3 px-4 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-sm"
                >
                  <Coins className="w-3.5 h-3.5 text-amber-300" />
                  <span>Authorize & Pay {requiredGp} GP</span>
                </button>
              </div>
            </div>
          )}

          {/* Processing Screen */}
          {step === 'processing' && (
            <div className="p-8 text-center space-y-4">
              <div className="w-16 h-16 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 mx-auto flex items-center justify-center animate-pulse">
                <RefreshCw className="w-8 h-8 animate-spin" />
              </div>
              <div className="space-y-1">
                <h4 className="text-base font-bold text-slate-900 dark:text-white">Processing Telecom Recharge</h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
                  Authorizing GP deduction and dispatching order to {NETWORK_METADATA[selectedNetwork].name}...
                </p>
              </div>
              <div className="text-[11px] text-slate-400 font-mono">
                Secure Grobaax VTU Gateway Engine
              </div>
            </div>
          )}

          {/* Result Screen */}
          {step === 'result' && resultState && (
            <div className="space-y-6">
              <div className="text-center space-y-2">
                <div
                  className={`w-14 h-14 rounded-full mx-auto flex items-center justify-center ${
                    resultState.status === 'SUCCESS'
                      ? 'bg-emerald-500/10 text-emerald-500'
                      : resultState.status === 'PENDING'
                      ? 'bg-amber-500/10 text-amber-500'
                      : 'bg-rose-500/10 text-rose-500'
                  }`}
                >
                  {resultState.status === 'SUCCESS' ? (
                    <CheckCircle2 className="w-8 h-8" />
                  ) : resultState.status === 'PENDING' ? (
                    <Clock className="w-8 h-8" />
                  ) : (
                    <AlertCircle className="w-8 h-8" />
                  )}
                </div>

                <h4 className="text-lg font-bold text-slate-900 dark:text-white">
                  {resultState.status === 'SUCCESS'
                    ? 'Recharge Successful!'
                    : resultState.status === 'PENDING'
                    ? 'Transaction Processing'
                    : 'Recharge Failed'}
                </h4>

                <p className="text-xs text-slate-600 dark:text-slate-400 max-w-md mx-auto">
                  {resultState.message}
                </p>
              </div>

              {/* Receipt / Details Card */}
              {resultState.transaction && (
                <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-2.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-500">Transaction Ref:</span>
                    <button
                      onClick={() => handleCopy(resultState.transaction!.transactionId)}
                      className="font-mono text-blue-600 dark:text-blue-400 font-bold flex items-center gap-1 hover:underline"
                    >
                      {resultState.transaction.transactionId}
                      {copiedTxId === resultState.transaction.transactionId ? (
                        <Check className="w-3 h-3 text-emerald-500" />
                      ) : (
                        <Copy className="w-3 h-3" />
                      )}
                    </button>
                  </div>

                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-500">Recipient Phone:</span>
                    <span className="font-bold text-slate-900 dark:text-white">
                      {resultState.transaction.phoneNumber} ({resultState.transaction.network})
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-500">Amount Fulfilled:</span>
                    <span className="font-bold text-slate-900 dark:text-white">
                      ₦{resultState.transaction.amountNGN.toLocaleString()} NGN
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-500">GP Redeemed:</span>
                    <span className="font-bold text-blue-600 dark:text-blue-400">
                      {resultState.transaction.gpAmount.toLocaleString()} GP
                    </span>
                  </div>

                  {resultState.refunded && (
                    <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-xs flex items-center gap-1.5 font-bold">
                      <CheckCircle2 className="w-4 h-4" />
                      Auto-Refunded {resultState.refundedGp || resultState.transaction.gpAmount} GP back to your wallet.
                    </div>
                  )}
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex items-center justify-center gap-3">
                <button
                  id={`${baseId}-btn-done`}
                  onClick={() => {
                    setStep('form');
                    setActiveSubTab('history');
                  }}
                  className="px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs transition"
                >
                  View Transaction History
                </button>
                <button
                  id={`${baseId}-btn-another`}
                  onClick={() => {
                    setStep('form');
                    setCustomAmountStr('');
                  }}
                  className="px-6 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition"
                >
                  Make Another Purchase
                </button>
              </div>
            </div>
          )}
        </>
      ) : (
        /* History Sub-tab */
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Your Airtime & Data Redemptions
            </h4>
            <span className="text-xs text-slate-400">
              {userTransactions.length} Total records
            </span>
          </div>

          {/* Network & Wallet Protection Guarantee Note */}
          <div className="p-3.5 rounded-2xl bg-blue-50/70 dark:bg-blue-900/20 border border-blue-200/60 dark:border-blue-800/40 flex items-start gap-2.5">
            <ShieldCheck className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
            <div className="text-xs space-y-0.5 text-slate-700 dark:text-slate-300">
              <p className="font-bold text-blue-900 dark:text-blue-300">
                Wallet Balance & Network Assurance
              </p>
              <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed">
                GP is deducted only upon verified recharge. If telecom network issues prevent fulfillment, the order will not proceed and your GP is automatically refunded. If an order was delayed in transit, you can click <span className="font-semibold text-blue-600 dark:text-blue-400">Check Status</span> below to confirm delivery or trigger instant wallet refund.
              </p>
            </div>
          </div>

          {userTransactions.length === 0 ? (
            <div className="p-12 text-center rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-2">
              <Smartphone className="w-8 h-8 text-slate-400 mx-auto" />
              <p className="text-sm font-bold text-slate-700 dark:text-slate-300">No redemptions yet</p>
              <p className="text-xs text-slate-400 max-w-xs mx-auto">
                Purchased Nigerian airtime and data using your GP balance will show up right here in real time.
              </p>
              <button
                onClick={() => {
                  setActiveSubTab('purchase');
                  setStep('form');
                }}
                className="mt-2 px-4 py-2 rounded-xl bg-blue-600 text-white font-bold text-xs hover:bg-blue-500 transition"
              >
                Purchase Airtime or Data
              </button>
            </div>
          ) : (
            <div className="space-y-2.5 max-h-96 overflow-y-auto pr-1">
              {userTransactions.map((tx) => {
                const isSuccess = tx.status === 'SUCCESS';
                const isPending = tx.status === 'PENDING';
                const isRefunded = tx.status === 'REFUNDED' || tx.refundStatus === 'REFUNDED';
                const isChecking = requeryingTxId === (tx.transactionId || tx.id);

                return (
                  <div
                    key={tx.id || tx.transactionId}
                    className="p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:border-slate-300 transition"
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`p-2.5 rounded-xl shrink-0 ${
                          isSuccess
                            ? 'bg-emerald-500/10 text-emerald-500'
                            : isPending
                            ? 'bg-amber-500/10 text-amber-500'
                            : 'bg-rose-500/10 text-rose-500'
                        }`}
                      >
                        {tx.serviceType === 'airtime' ? <Phone className="w-4 h-4" /> : <Wifi className="w-4 h-4" />}
                      </div>

                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs font-bold text-slate-900 dark:text-white">
                            {tx.productName || `${tx.network} ₦${tx.amountNGN.toLocaleString()}`}
                          </span>
                          <span
                            className={`px-2 py-0.5 rounded-full text-[9px] font-extrabold uppercase ${
                              isSuccess
                                ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                                : isPending
                                ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20'
                                : 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20'
                            }`}
                          >
                            {isRefunded ? 'REFUNDED' : tx.status}
                          </span>
                        </div>

                        <div className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-2">
                          <span>{tx.phoneNumber}</span>
                          <span>•</span>
                          <span>{typeof tx.createdAt === 'string' ? tx.createdAt.split('T')[0] : 'Recent'}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between sm:justify-end gap-3">
                      {isPending && (
                        <button
                          onClick={() => handleRequeryTransaction(tx)}
                          disabled={isChecking}
                          className="px-2.5 py-1 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-700 dark:text-amber-400 text-[11px] font-bold border border-amber-500/20 flex items-center gap-1 transition disabled:opacity-50"
                        >
                          <RefreshCw className={`w-3 h-3 ${isChecking ? 'animate-spin' : ''}`} />
                          <span>{isChecking ? 'Verifying...' : 'Check Status'}</span>
                        </button>
                      )}

                      <div className="text-right">
                        <div className={`text-xs font-extrabold flex items-center justify-end gap-1 ${
                          isRefunded ? 'text-emerald-600 dark:text-emerald-400' : 'text-blue-600 dark:text-blue-400'
                        }`}>
                          <Coins className="w-3.5 h-3.5 text-amber-500" />
                          {isRefunded ? `+${tx.gpAmount.toLocaleString()} GP (Refunded)` : `-${tx.gpAmount.toLocaleString()} GP`}
                        </div>
                        <span className="text-[10px] text-slate-400 font-mono">
                          {tx.transactionId ? `${tx.transactionId.substring(0, 14)}...` : ''}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
