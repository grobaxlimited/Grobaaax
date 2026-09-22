import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { BadgeStoreItem, SponsorshipCampaign, UserProfile } from '../../types';
import { normalizeDestinationUrl } from '../../lib/urlUtils';
import { db, adjustUserGpInFirestore, collection, getDocs, query, limit, isMockSponsorshipCampaign } from '../../lib/firebase';
import { AdminTransactionsView } from '../Admin/AdminTransactionsView';
import {
  Wallet,
  DollarSign,
  ArrowDownRight,
  CheckCircle2,
  XCircle,
  Plus,
  Edit2,
  Trash2,
  Clock,
  Sparkles,
  Send,
  AlertCircle,
  TrendingUp,
  Sliders,
  Shield,
  Layers,
  Search,
  Users,
  RefreshCw,
  UserCheck,
  Receipt,
} from 'lucide-react';

export const AdminWalletManager: React.FC = () => {
  const {
    withdrawals,
    updateWithdrawalStatus,
    gpConversionConfig,
    updateGpConversionConfig,
    adminAdjustGpBalance,
    adminAdjustTargetUserGp,
    badgeStore,
    addBadgeToStore,
    deleteBadgeFromStore,
    updateBadgeInStore,
    sponsorshipCampaigns,
    addSponsorshipCampaign,
    updateSponsorshipCampaign,
    deleteSponsorshipCampaign,
    sendNotification,
    currentUser,
  } = useApp();

  const [activeAdminSubTab, setActiveAdminSubTab] = useState<
    'withdrawals' | 'transactions' | 'conversion' | 'badges' | 'sponsorships' | 'adjust' | 'notifications'
  >('withdrawals');

  // Firestore users for Scholar Account GP Manager
  const [allUsers, setAllUsers] = useState<UserProfile[]>([]);
  const [selectedTargetUserId, setSelectedTargetUserId] = useState<string>('');
  const [userSearchTerm, setUserSearchTerm] = useState('');
  const [isAdjustingTarget, setIsAdjustingTarget] = useState(false);
  const [adjustSuccessMsg, setAdjustSuccessMsg] = useState('');

  const loadUsersForWallet = async () => {
    try {
      const snap = await getDocs(query(collection(db, 'users'), limit(50)));
      const uList: UserProfile[] = [];
      snap.forEach((d) => {
        const uData = d.data();
        uList.push({
          id: d.id,
          uid: d.id,
          name: uData.fullName || uData.name || uData.username || 'Scholar',
          fullName: uData.fullName || uData.name || 'Scholar',
          username: uData.username || uData.email?.split('@')[0] || d.id.substring(0, 6),
          email: uData.email || '',
          avatar: uData.profileImage || uData.avatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${d.id}`,
          profileImage: uData.profileImage || uData.avatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${d.id}`,
          role: uData.role || 'student',
          institution: uData.institutionName || uData.institution || 'Grobaax Academy',
          department: uData.departmentName || uData.department || 'General',
          major: uData.major || uData.departmentName || uData.department || 'Undergraduate',
          level: uData.level || '100 Level',
          gpBalance: typeof uData.gpBalance === 'number' ? uData.gpBalance : Number(uData.gpBalance || 0),
          grbxTokens: uData.grbxTokens || 0,
          stakedTokens: uData.stakedTokens || 0,
          reputationPoints: uData.reputationPoints || 100,
          gusRank: uData.gusRank || 0,
          gusTier: uData.gusTier || 'Novice',
          walletAddress: uData.walletAddress || `0x${d.id.substring(0, 10)}`,
          bio: uData.bio || '',
          verified: Boolean(uData.verified),
          privacy: uData.privacy || {
            showInstitution: true,
            showDepartment: true,
            showLevel: true,
            institutionVisibility: 'Public',
            departmentVisibility: 'Public',
            levelVisibility: 'Public',
            showAcademicInfoOnPosts: true,
          },
          badges: uData.badges || [],
          purchasedBadgeIds: uData.purchasedBadgeIds || [],
        });
      });
      setAllUsers(uList);
    } catch (err) {
      console.warn('Admin users sync notice:', err);
    }
  };

  useEffect(() => {
    loadUsersForWallet();
  }, []);

  // Conversion config state
  const [rate, setRate] = useState(gpConversionConfig.gpToFiatRate || 1);
  const [minGp, setMinGp] = useState(gpConversionConfig.minimumWithdrawalGP || 1000);
  const [maxGp, setMaxGp] = useState(gpConversionConfig.maximumWithdrawalGP || 500000);
  const [feeGp, setFeeGp] = useState(gpConversionConfig.withdrawalFeeGP || 0);
  const [savedSuccess, setSavedSuccess] = useState(false);

  useEffect(() => {
    if (gpConversionConfig) {
      setRate(gpConversionConfig.gpToFiatRate || 1);
      setMinGp(gpConversionConfig.minimumWithdrawalGP || 1000);
      setMaxGp(gpConversionConfig.maximumWithdrawalGP || 500000);
      setFeeGp(gpConversionConfig.withdrawalFeeGP || 0);
    }
  }, [gpConversionConfig]);

  // Manual Adjust state
  const [adjustAmount, setAdjustAmount] = useState('');
  const [adjustReason, setAdjustReason] = useState('');

  // New Badge Modal State
  const [isBadgeModalOpen, setIsBadgeModalOpen] = useState(false);
  const [badgeName, setBadgeName] = useState('');
  const [badgeImage, setBadgeImage] = useState('🏆');
  const [badgePrice, setBadgePrice] = useState('500');
  const [badgeDesc, setBadgeDesc] = useState('');

  // New Sponsor Modal State
  const [isSponsorModalOpen, setIsSponsorModalOpen] = useState(false);
  const [spTitle, setSpTitle] = useState('');
  const [spSponsor, setSpSponsor] = useState('');
  const [spLogo, setSpLogo] = useState('📱');
  const [spText, setSpText] = useState('');
  const [spUrl, setSpUrl] = useState('');
  const [spPlacement, setSpPlacement] = useState<SponsorshipCampaign['placement']>('Ticker');
  const [spPriority, setSpPriority] = useState<SponsorshipCampaign['priority']>('High');

  // Notification Modal State
  const [notifTitle, setNotifTitle] = useState('');
  const [notifMessage, setNotifMessage] = useState('');

  const handleSaveConversionConfig = (e: React.FormEvent) => {
    e.preventDefault();
    updateGpConversionConfig({
      gpToFiatRate: Number(rate),
      currencySymbol: '₦',
      currencyCode: 'NGN',
      minimumWithdrawalGP: Number(minGp),
      maximumWithdrawalGP: Number(maxGp),
      withdrawalFeeGP: Number(feeGp),
    });
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 4000);
  };

  const handleManualAdjust = async (e: React.FormEvent) => {
    e.preventDefault();
    const amt = Number(adjustAmount);
    if (!amt || isNaN(amt)) return;
    
    setIsAdjustingTarget(true);
    setAdjustSuccessMsg('');

    try {
      const targetUser = allUsers.find(u => u.id === selectedTargetUserId) || currentUser;
      const targetId = targetUser.id || (targetUser as any).uid;

      if (targetId === currentUser.id) {
        await adminAdjustGpBalance(amt, adjustReason);
      } else {
        if (adminAdjustTargetUserGp) {
          await adminAdjustTargetUserGp(targetId, amt, adjustReason || 'Administrative wallet adjustment');
        } else {
          await adjustUserGpInFirestore(targetId, amt, adjustReason || 'Administrative wallet adjustment', currentUser?.id);
        }
      }

      await loadUsersForWallet();

      setAdjustSuccessMsg(`Successfully adjusted GP for ${targetUser.name || targetUser.username} by ${amt > 0 ? '+' : ''}${amt.toLocaleString()} GP.`);
      setAdjustAmount('');
      setAdjustReason('');
      setTimeout(() => setAdjustSuccessMsg(''), 5000);
    } catch (err: any) {
      console.error('Error adjusting GP:', err);
      alert(`Error adjusting GP: ${err?.message || err}`);
    } finally {
      setIsAdjustingTarget(false);
    }
  };

  const handleCreateBadge = (e: React.FormEvent) => {
    e.preventDefault();
    if (!badgeName || !badgePrice) return;
    addBadgeToStore({
      name: badgeName,
      image: badgeImage || '🏆',
      gpPrice: Number(badgePrice),
      description: badgeDesc,
      active: true,
      color: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
    });
    setBadgeName('');
    setBadgeDesc('');
    setIsBadgeModalOpen(false);
  };

  const handleCreateSponsor = (e: React.FormEvent) => {
    e.preventDefault();
    if (!spTitle || !spText) return;
    addSponsorshipCampaign({
      title: spTitle,
      sponsorName: spSponsor,
      logo: spLogo || '📱',
      text: spText,
      destinationUrl: spUrl ? normalizeDestinationUrl(spUrl.trim()) : undefined,
      startDate: new Date().toISOString().split('T')[0],
      endDate: '2026-12-31',
      placement: spPlacement,
      priority: spPriority,
      status: 'Active',
    });
    setSpTitle('');
    setSpSponsor('');
    setSpText('');
    setIsSponsorModalOpen(false);
  };

  const handleSendBroadcastNotif = (e: React.FormEvent) => {
    e.preventDefault();
    if (!notifTitle || !notifMessage) return;
    sendNotification({
      title: notifTitle,
      message: notifMessage,
      type: 'system',
    });
    setNotifTitle('');
    setNotifMessage('');
    alert('📢 Broadcast notification dispatched to all scholars.');
  };

  return (
    <div className="space-y-6 bg-slate-900/90 text-slate-100 p-6 rounded-2xl border border-slate-800 shadow-2xl">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <Shield className="w-6 h-6 text-emerald-400" />
            <h2 className="text-xl font-bold text-white tracking-wide">Wallet & Economy Management</h2>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Authoritative admin console: Private GP conversion rates, withdrawal processing, badges, and sponsorship ads.
          </p>
        </div>

        {/* Subtabs Toggle */}
        <div className="flex flex-wrap p-1 bg-slate-950 rounded-xl border border-slate-800 gap-1">
          {(
            [
              { id: 'withdrawals', label: 'Withdrawals' },
              { id: 'transactions', label: 'Transactions Log' },
              { id: 'conversion', label: 'GP Rates' },
              { id: 'badges', label: 'GP Store' },
              { id: 'sponsorships', label: 'Sponsorship Ads' },
              { id: 'adjust', label: 'Adjust Balance' },
              { id: 'notifications', label: 'Broadcasts' },
            ] as const
          ).map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveAdminSubTab(tab.id)}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                activeAdminSubTab === tab.id
                  ? 'bg-emerald-500 text-slate-950 shadow-md'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* SUBTAB: ALL PLATFORM TRANSACTIONS */}
      {activeAdminSubTab === 'transactions' && (
        <AdminTransactionsView />
      )}

      {/* SUBTAB 1: WITHDRAWALS */}
      {activeAdminSubTab === 'withdrawals' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center bg-slate-950 p-3 rounded-xl border border-slate-800">
            <h3 className="font-bold text-xs text-slate-200">
              Withdrawal Requests ({withdrawals.length})
            </h3>
            <span className="text-[11px] text-emerald-400 font-semibold">
              Pending Total: {withdrawals.filter(w => w.status === 'Pending').length}
            </span>
          </div>

          <div className="space-y-3">
            {withdrawals.length === 0 ? (
              <div className="p-8 text-center text-slate-500 text-xs bg-slate-950/40 rounded-xl border border-slate-800">
                No withdrawal records currently logged.
              </div>
            ) : (
              withdrawals.map(req => (
                <div
                  key={req.id}
                  className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm text-slate-100">{req.amountGP} GP</span>
                      <span className="text-xs font-extrabold text-emerald-400">({req.fiatValue})</span>
                      <span
                        className={`px-2 py-0.5 text-[10px] font-bold rounded border ${
                          req.status === 'Paid' || req.status === 'Approved'
                            ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                            : req.status === 'Pending'
                            ? 'bg-amber-500/20 text-amber-400 border-amber-500/30'
                            : 'bg-rose-500/20 text-rose-400 border-rose-500/30'
                        }`}
                      >
                        {req.status}
                      </span>
                    </div>

                    <div className="text-xs text-slate-400 space-x-2">
                      <span>Bank: <strong className="text-slate-200">{req.bankName}</strong></span>
                      <span>Account: <strong className="text-slate-200">{req.accountNumber}</strong></span>
                      <span>Requested: {req.requestDate}</span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2">
                    {req.status === 'Pending' && (
                      <>
                        <button
                          onClick={() => updateWithdrawalStatus(req.id, 'Approved', 'Approved by Admin')}
                          className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-lg shadow-sm flex items-center gap-1 cursor-pointer"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Approve</span>
                        </button>
                        <button
                          onClick={() => updateWithdrawalStatus(req.id, 'Rejected', 'Insufficient verification details')}
                          className="px-3 py-1.5 bg-rose-600/80 hover:bg-rose-600 text-white font-bold text-xs rounded-lg shadow-sm flex items-center gap-1 cursor-pointer"
                        >
                          <XCircle className="w-3.5 h-3.5" />
                          <span>Reject</span>
                        </button>
                      </>
                    )}

                    {req.status === 'Approved' && (
                      <button
                        onClick={() => updateWithdrawalStatus(req.id, 'Paid', 'Payout completed via bank transfer')}
                        className="px-3 py-1.5 bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs rounded-lg shadow-sm flex items-center gap-1 cursor-pointer"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Mark Paid</span>
                      </button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* SUBTAB 2: GP CONVERSION RATES */}
      {activeAdminSubTab === 'conversion' && (
        <form onSubmit={handleSaveConversionConfig} className="space-y-4 max-w-xl">
          <div className="p-4 bg-blue-950/30 border border-blue-500/30 rounded-2xl text-xs text-blue-200 space-y-1">
            <div className="font-bold text-blue-300 flex items-center gap-1.5">
              <Shield className="w-4 h-4 text-blue-400" />
              <span>OFFICIAL GP CONVERSION & CASH OUT GOVERNANCE</span>
            </div>
            <p className="text-[11px] text-blue-300/80">
              Administrators control the conversion rate of Grand Unified Scholar Points (GP) to Nigerian Naira (₦). Changes update immediately in all scholar wallets and cash out forms.
            </p>
          </div>

          {savedSuccess && (
            <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-bold flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>Conversion configuration saved and synced across all scholar apps!</span>
            </div>
          )}

          <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">
                Conversion Rate: 1 GP = ₦ [Naira Rate] NGN
              </label>
              <div className="flex items-center gap-2">
                <span className="px-3 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-xs font-bold text-emerald-400">
                  1 GP = ₦
                </span>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  value={rate}
                  onChange={e => setRate(Number(e.target.value))}
                  className="flex-1 p-2.5 rounded-xl bg-slate-900 border border-slate-800 text-sm font-bold text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
                <span className="px-3 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-xs font-bold text-slate-400">
                  NGN
                </span>
              </div>
              <p className="text-[11px] text-slate-400 mt-1">
                Default: <strong>1 GP = ₦1.00 NGN</strong>. 1,000 GP = ₦{(1000 * (Number(rate) || 1)).toLocaleString()} NGN.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  Minimum Cash Out (GP)
                </label>
                <input
                  type="number"
                  min="100"
                  value={minGp}
                  onChange={e => setMinGp(Number(e.target.value))}
                  className="w-full p-2.5 rounded-xl bg-slate-900 border border-slate-800 text-xs font-bold text-slate-100"
                  required
                />
                <p className="text-[10px] text-amber-400 mt-1">
                  Min Payout: ₦{(Number(minGp) * (Number(rate) || 1)).toLocaleString()} NGN
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  Maximum Cash Out Limit (GP)
                </label>
                <input
                  type="number"
                  min="1000"
                  value={maxGp}
                  onChange={e => setMaxGp(Number(e.target.value))}
                  className="w-full p-2.5 rounded-xl bg-slate-900 border border-slate-800 text-xs font-bold text-slate-100"
                  required
                />
                <p className="text-[10px] text-slate-400 mt-1">
                  Max Payout: ₦{(Number(maxGp) * (Number(rate) || 1)).toLocaleString()} NGN
                </p>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">
                Processing Fee (GP)
              </label>
              <input
                type="number"
                min="0"
                value={feeGp}
                onChange={e => setFeeGp(Number(e.target.value))}
                className="w-full p-2.5 rounded-xl bg-slate-900 border border-slate-800 text-xs font-bold text-slate-100"
                required
              />
              <p className="text-[10px] text-slate-400 mt-1">
                Fee deducted upon cash out (0 for free withdrawals).
              </p>
            </div>
          </div>

          {/* Real-time Payout Simulation Card */}
          <div className="p-4 rounded-2xl bg-emerald-950/20 border border-emerald-500/20 space-y-2">
            <div className="text-xs font-bold text-emerald-400 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Live Scholar Payout Calculation Preview</span>
            </div>
            <div className="grid grid-cols-3 gap-2 text-center text-xs">
              <div className="p-2 rounded-xl bg-slate-900/60 border border-slate-800">
                <div className="text-[10px] text-slate-400">1,000 GP (Min)</div>
                <div className="font-extrabold text-emerald-400">₦{(1000 * (Number(rate) || 1)).toLocaleString()}</div>
              </div>
              <div className="p-2 rounded-xl bg-slate-900/60 border border-slate-800">
                <div className="text-[10px] text-slate-400">5,000 GP</div>
                <div className="font-extrabold text-emerald-400">₦{(5000 * (Number(rate) || 1)).toLocaleString()}</div>
              </div>
              <div className="p-2 rounded-xl bg-slate-900/60 border border-slate-800">
                <div className="text-[10px] text-slate-400">10,000 GP</div>
                <div className="font-extrabold text-emerald-400">₦{(10000 * (Number(rate) || 1)).toLocaleString()}</div>
              </div>
            </div>
          </div>

          <button
            type="submit"
            className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow-lg shadow-emerald-600/20 cursor-pointer transition-all flex items-center justify-center gap-2"
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>Save & Broadcast Conversion Rules</span>
          </button>
        </form>
      )}

      {/* SUBTAB 3: GP STORE BADGES */}
      {activeAdminSubTab === 'badges' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center bg-slate-950 p-3 rounded-xl border border-slate-800">
            <h3 className="font-bold text-xs text-slate-200">GP Store Badges ({badgeStore.length})</h3>
            <button
              onClick={() => setIsBadgeModalOpen(true)}
              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Add New Badge</span>
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {badgeStore.map(b => (
              <div
                key={b.id}
                className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 flex items-center gap-3"
              >
                <span className="text-2xl p-2 bg-slate-900 rounded-xl border border-slate-800">
                  {b.image}
                </span>
                <div className="flex-1">
                  <div className="font-bold text-xs text-slate-100">{b.name}</div>
                  <div className="text-[10px] text-amber-400 font-bold">{b.gpPrice} GP</div>
                  <div className="text-[10px] text-slate-400 line-clamp-1">{b.description}</div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    if (confirm(`Remove "${b.name}" badge from store?`)) {
                      deleteBadgeFromStore(b.id);
                    }
                  }}
                  title="Delete Badge"
                  className="p-1.5 text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* SUBTAB 4: SPONSORSHIPS & ADS */}
      {activeAdminSubTab === 'sponsorships' && (() => {
        const realSponsorships = (sponsorshipCampaigns || []).filter(sp => !isMockSponsorshipCampaign(sp));
        return (
          <div className="space-y-4">
            <div className="flex justify-between items-center bg-slate-950 p-3 rounded-xl border border-slate-800">
              <h3 className="font-bold text-xs text-slate-200">
                Active Sponsorship Campaigns ({realSponsorships.length})
              </h3>
              <button
                onClick={() => setIsSponsorModalOpen(true)}
                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>New Sponsor Campaign</span>
              </button>
            </div>

            {realSponsorships.length === 0 ? (
              <div className="p-8 text-center bg-slate-950/60 border border-slate-800 rounded-xl text-xs text-slate-400">
                No active sponsorship campaigns created yet. Click "New Sponsor Campaign" to launch a campaign.
              </div>
            ) : (
              <div className="space-y-3">
                {realSponsorships.map(sp => (
                  <div
                    key={sp.id}
                    className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 flex items-center justify-between gap-3"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-lg">{sp.logo}</span>
                        <span className="font-bold text-xs text-slate-100">{sp.title}</span>
                        <span className="px-2 py-0.5 text-[9px] font-bold bg-amber-500/20 text-amber-400 border border-amber-500/30 rounded">
                          {sp.placement}
                        </span>
                      </div>
                      <p className="text-xs text-slate-400 mt-1">{sp.text}</p>
                    </div>

                    <button
                      onClick={() => deleteSponsorshipCampaign(sp.id)}
                      className="p-1.5 text-slate-400 hover:text-rose-400 transition-colors"
                      title="Delete Campaign"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })()}

      {/* SUBTAB 5: MANUAL BALANCE ADJUSTMENT & USER ACCOUNT WALLETS */}
      {activeAdminSubTab === 'adjust' && (
        <div className="space-y-6 max-w-2xl">
          <div className="p-4 bg-slate-950 border border-slate-800 rounded-2xl space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <Users className="w-4 h-4 text-emerald-400" />
                Target User Account Selection
              </span>
              <span className="text-[11px] text-emerald-400 font-medium">
                {allUsers.length} Users Synced in Real-Time
              </span>
            </div>

            {/* Search and User Picker */}
            <div className="space-y-2">
              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                <input
                  type="text"
                  value={userSearchTerm}
                  onChange={(e) => setUserSearchTerm(e.target.value)}
                  placeholder="Search user by name, email, username..."
                  className="w-full pl-8 pr-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs text-slate-200 placeholder-slate-500 focus:ring-1 focus:ring-emerald-500"
                />
              </div>

              <select
                value={selectedTargetUserId || currentUser.id}
                onChange={(e) => setSelectedTargetUserId(e.target.value)}
                className="w-full p-2.5 rounded-xl bg-slate-900 border border-slate-800 text-xs font-semibold text-slate-200 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              >
                <option value={currentUser.id}>
                  👑 Admin Personal Wallet: {currentUser.name} (@{currentUser.username}) - [{(currentUser.gpBalance || 0).toLocaleString()} GP] • VIP Titan Plan
                </option>
                {allUsers
                  .filter((u) => {
                    if (u.id === currentUser.id) return false;
                    if (!userSearchTerm) return true;
                    const q = userSearchTerm.toLowerCase();
                    return (
                      (u.name || '').toLowerCase().includes(q) ||
                      (u.username || '').toLowerCase().includes(q) ||
                      (u.email || '').toLowerCase().includes(q) ||
                      (u.institution || '').toLowerCase().includes(q)
                    );
                  })
                  .map((u) => (
                    <option key={u.id} value={u.id}>
                      🎓 {u.name} (@{u.username}) {u.email ? `• ${u.email}` : ''} - [{(u.gpBalance || 0).toLocaleString()} GP]
                    </option>
                  ))}
              </select>
            </div>

            {/* Target User Summary Card */}
            {(() => {
              const target = allUsers.find((u) => u.id === selectedTargetUserId) || currentUser;
              return (
                <div className="mt-3 p-3.5 rounded-xl bg-slate-900/90 border border-slate-800/80 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <img
                      src={target.avatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${target.id}`}
                      alt={target.name}
                      className="w-10 h-10 rounded-full bg-slate-800 border border-emerald-500/20"
                    />
                    <div>
                      <div className="text-xs font-bold text-slate-100 flex items-center gap-1.5">
                        {target.name}
                        {target.verified && <CheckCircle2 className="w-3.5 h-3.5 text-blue-400" />}
                      </div>
                      <div className="text-[11px] text-slate-400">
                        @{target.username} {target.email ? `• ${target.email}` : ''}
                      </div>
                      <div className="text-[10px] text-slate-500 font-mono">
                        {target.institution || 'Grobaax Scholar'} • {target.department || 'Undergraduate'}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-[10px] uppercase font-bold text-slate-400">GP Balance</div>
                    <div className="text-base font-extrabold text-amber-400">
                      {(target.gpBalance || 0).toLocaleString()} GP
                    </div>
                    <div className="text-[10px] text-emerald-400 font-medium">
                      {(target.grbxTokens || 0).toLocaleString()} GRBX
                    </div>
                  </div>
                </div>
              );
            })()}
          </div>

          {adjustSuccessMsg && (
            <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-bold flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{adjustSuccessMsg}</span>
            </div>
          )}

          <form onSubmit={handleManualAdjust} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1.5">
                Adjustment Amount (GP)
              </label>
              <input
                type="number"
                value={adjustAmount}
                onChange={(e) => setAdjustAmount(e.target.value)}
                placeholder="e.g. 500 for credit, or -200 for debit"
                className="w-full p-3 rounded-xl bg-slate-950 border border-slate-800 text-sm font-bold text-slate-100 placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                required
              />
              {/* Quick Presets */}
              <div className="flex flex-wrap gap-2 mt-2">
                {[+100, +250, +500, +1000, +3000, +5000, -500].map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => setAdjustAmount(String(preset))}
                    className="px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 text-[11px] font-semibold text-slate-300 hover:text-white transition"
                  >
                    {preset > 0 ? `+${preset.toLocaleString()}` : preset.toLocaleString()} GP
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1.5">
                Reason / Audit Log Note *
              </label>
              <input
                type="text"
                value={adjustReason}
                onChange={(e) => setAdjustReason(e.target.value)}
                placeholder="e.g. Official competition reward grant, refund, or correction"
                className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-100 placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                required
              />
            </div>

            <button
              type="submit"
              disabled={isAdjustingTarget || !adjustAmount}
              className="w-full sm:w-auto px-6 py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow-lg shadow-emerald-600/20 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {isAdjustingTarget ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Updating Firestore Wallet...</span>
                </>
              ) : (
                <>
                  <Wallet className="w-4 h-4" />
                  <span>Execute GP Wallet Adjustment</span>
                </>
              )}
            </button>
          </form>
        </div>
      )}

      {/* SUBTAB 6: NOTIFICATIONS BROADCAST */}
      {activeAdminSubTab === 'notifications' && (
        <form onSubmit={handleSendBroadcastNotif} className="space-y-4 max-w-lg">
          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-1">Notification Title</label>
            <input
              type="text"
              value={notifTitle}
              onChange={e => setNotifTitle(e.target.value)}
              placeholder="e.g. Dome Session 5 Live Announcement"
              className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-100"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-1">Message</label>
            <textarea
              rows={3}
              value={notifMessage}
              onChange={e => setNotifMessage(e.target.value)}
              placeholder="Detailed notification text sent to all active scholars..."
              className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-100 resize-none"
              required
            />
          </div>

          <button
            type="submit"
            className="px-5 py-2.5 bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs rounded-xl shadow-lg shadow-cyan-600/20 flex items-center gap-2 cursor-pointer"
          >
            <Send className="w-4 h-4" />
            <span>Broadcast Notification</span>
          </button>
        </form>
      )}

      {/* Create Badge Modal */}
      {isBadgeModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl space-y-4">
            <h3 className="text-lg font-bold text-white">Add New GP Store Badge</h3>
            <form onSubmit={handleCreateBadge} className="space-y-3">
              <div>
                <label className="block text-xs text-slate-400 mb-1">Badge Title</label>
                <input
                  type="text"
                  value={badgeName}
                  onChange={e => setBadgeName(e.target.value)}
                  placeholder="e.g. Apex Scholar"
                  className="w-full p-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-100"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Emoji / Icon</label>
                  <input
                    type="text"
                    value={badgeImage}
                    onChange={e => setBadgeImage(e.target.value)}
                    className="w-full p-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-100"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs text-slate-400 mb-1">GP Price</label>
                  <input
                    type="number"
                    value={badgePrice}
                    onChange={e => setBadgePrice(e.target.value)}
                    className="w-full p-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-100"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs text-slate-400 mb-1">Description</label>
                <textarea
                  rows={2}
                  value={badgeDesc}
                  onChange={e => setBadgeDesc(e.target.value)}
                  placeholder="Short description of badge significance..."
                  className="w-full p-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-100 resize-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsBadgeModalOpen(false)}
                  className="px-3 py-1.5 text-xs text-slate-400 hover:text-slate-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl"
                >
                  Create Badge
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Create Sponsor Modal */}
      {isSponsorModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl space-y-4">
            <h3 className="text-lg font-bold text-white">New Sponsor Campaign</h3>
            <form onSubmit={handleCreateSponsor} className="space-y-3">
              <div>
                <label className="block text-xs text-slate-400 mb-1">Campaign Title</label>
                <input
                  type="text"
                  value={spTitle}
                  onChange={e => setSpTitle(e.target.value)}
                  placeholder="e.g. MTN Data & Device Grant"
                  className="w-full p-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-100"
                  required
                />
              </div>

              <div>
                <label className="block text-xs text-slate-400 mb-1">Sponsor Name</label>
                <input
                  type="text"
                  value={spSponsor}
                  onChange={e => setSpSponsor(e.target.value)}
                  placeholder="e.g. MTN Nigeria"
                  className="w-full p-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-100"
                  required
                />
              </div>

              <div>
                <label className="block text-xs text-slate-400 mb-1">Ticker / Banner Text</label>
                <textarea
                  rows={2}
                  value={spText}
                  onChange={e => setSpText(e.target.value)}
                  placeholder="Short sponsor announcement text for ticker..."
                  className="w-full p-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-100 resize-none"
                  required
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsSponsorModalOpen(false)}
                  className="px-3 py-1.5 text-xs text-slate-400 hover:text-slate-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl"
                >
                  Create Campaign
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
