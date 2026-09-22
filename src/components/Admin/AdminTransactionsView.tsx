import React, { useState, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import { Transaction, UserProfile } from '../../types';
import { adjustUserGpInFirestore } from '../../lib/firebase';
import {
  Receipt,
  Search,
  Filter,
  ArrowUpRight,
  ArrowDownRight,
  Download,
  RefreshCw,
  Coins,
  ShieldAlert,
  User,
  CheckCircle2,
  Clock,
  XCircle,
  Copy,
  Check,
  TrendingUp,
  TrendingDown,
  Sparkles,
  SlidersHorizontal,
  Layers,
  Award,
  Zap,
  Building,
  Smartphone,
  Calendar,
  Eye,
  PlusCircle,
  MinusCircle,
  X,
} from 'lucide-react';

export function AdminTransactionsView() {
  const { transactions, currentUser, userProfile } = useApp();

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedType, setSelectedType] = useState<string>('all');
  const [selectedDirection, setSelectedDirection] = useState<'all' | 'credit' | 'debit'>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [dateRange, setDateRange] = useState<'all' | 'today' | '7days' | '30days'>('all');
  const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'highest' | 'lowest'>('newest');

  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [selectedTxDetail, setSelectedTxDetail] = useState<Transaction | null>(null);

  // Manual Adjust Modal State
  const [isAdjustModalOpen, setIsAdjustModalOpen] = useState(false);
  const [targetUserId, setTargetUserId] = useState('');
  const [adjustAmount, setAdjustAmount] = useState('');
  const [adjustAction, setAdjustAction] = useState<'add' | 'deduct'>('add');
  const [adjustReason, setAdjustReason] = useState('');
  const [isSubmittingAdjust, setIsSubmittingAdjust] = useState(false);
  const [adjustResultMsg, setAdjustResultMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Filter & Sort Logic
  const filteredTransactions = useMemo(() => {
    const now = Date.now();
    const oneDay = 24 * 60 * 60 * 1000;

    return transactions.filter((tx) => {
      // Search term
      if (searchTerm.trim()) {
        const query = searchTerm.toLowerCase();
        const matchesSearch =
          tx.title.toLowerCase().includes(query) ||
          tx.description.toLowerCase().includes(query) ||
          tx.transactionId.toLowerCase().includes(query) ||
          (tx.userName && tx.userName.toLowerCase().includes(query)) ||
          (tx.userEmail && tx.userEmail.toLowerCase().includes(query)) ||
          (tx.userId && tx.userId.toLowerCase().includes(query)) ||
          (tx.institutionName && tx.institutionName.toLowerCase().includes(query)) ||
          (tx.adminName && tx.adminName.toLowerCase().includes(query));

        if (!matchesSearch) return false;
      }

      // Direction
      if (selectedDirection === 'credit' && !tx.isCredit) return false;
      if (selectedDirection === 'debit' && tx.isCredit) return false;

      // Status
      if (selectedStatus !== 'all' && tx.status !== selectedStatus) return false;

      // Type filter
      if (selectedType !== 'all') {
        if (selectedType === 'quiz' && tx.type !== 'gp_earned') return false;
        if (selectedType === 'vtu' && tx.type !== 'vtu_purchase' && tx.type !== 'vtu_redemption') return false;
        if (selectedType === 'withdrawal' && tx.type !== 'gp_withdrawal' && tx.type !== 'withdrawal') return false;
        if (selectedType === 'badge' && tx.type !== 'badge_purchase') return false;
        if (selectedType === 'admin' && tx.type !== 'admin_adjustment') return false;
        if (selectedType === 'subscription' && tx.type !== 'subscription_purchase') return false;
        if (selectedType === 'reward' && tx.type !== 'reward' && tx.type !== 'grant' && tx.type !== 'GUS_PRIZE' && tx.type !== 'welcome_bonus') return false;
      }

      // Date Range filter
      if (dateRange !== 'all') {
        const txTime = tx.createdAt?.toMillis
          ? tx.createdAt.toMillis()
          : tx.createdAt?.seconds
          ? tx.createdAt.seconds * 1000
          : null;

        if (txTime) {
          if (dateRange === 'today' && now - txTime > oneDay) return false;
          if (dateRange === '7days' && now - txTime > 7 * oneDay) return false;
          if (dateRange === '30days' && now - txTime > 30 * oneDay) return false;
        }
      }

      return true;
    }).sort((a, b) => {
      if (sortBy === 'highest') return b.amount - a.amount;
      if (sortBy === 'lowest') return a.amount - b.amount;

      const timeA = a.createdAt?.toMillis
        ? a.createdAt.toMillis()
        : a.createdAt?.seconds
        ? a.createdAt.seconds * 1000
        : 0;
      const timeB = b.createdAt?.toMillis
        ? b.createdAt.toMillis()
        : b.createdAt?.seconds
        ? b.createdAt.seconds * 1000
        : 0;

      if (sortBy === 'oldest') return timeA - timeB;
      // Default newest first
      return timeB - timeA;
    });
  }, [transactions, searchTerm, selectedType, selectedDirection, selectedStatus, dateRange, sortBy]);

  // Platform Aggregate Totals
  const { totalCredits, totalDebits, netFlow } = useMemo(() => {
    let credits = 0;
    let debits = 0;
    transactions.forEach((tx) => {
      const amt = Number(tx.amount) || 0;
      if (tx.isCredit) {
        credits += amt;
      } else {
        debits += amt;
      }
    });
    return {
      totalCredits: credits,
      totalDebits: debits,
      netFlow: credits - debits,
    };
  }, [transactions]);

  // CSV Export
  const handleExportCSV = () => {
    if (filteredTransactions.length === 0) {
      alert('No transactions to export.');
      return;
    }

    const headers = [
      'Transaction ID',
      'Date',
      'User ID',
      'User Name',
      'Institution',
      'Type',
      'Title',
      'Description',
      'Flow',
      'Amount (GP)',
      'Status',
      'Admin Note / Reason',
    ];

    const rows = filteredTransactions.map((tx) => [
      `"${tx.transactionId || tx.id}"`,
      `"${tx.date || ''}"`,
      `"${tx.userId || ''}"`,
      `"${tx.userName || ''}"`,
      `"${tx.institutionName || ''}"`,
      `"${tx.type}"`,
      `"${(tx.title || '').replace(/"/g, '""')}"`,
      `"${(tx.description || '').replace(/"/g, '""')}"`,
      tx.isCredit ? 'Credit (+)' : 'Debit (-)',
      tx.amount,
      `"${tx.status}"`,
      `"${(tx.reason || '').replace(/"/g, '""')}"`,
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `grobax_transaction_ledger_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Submit Manual Adjustment
  const handlePerformAdjustment = async (e: React.FormEvent) => {
    e.preventDefault();
    const amt = Number(adjustAmount);
    if (!targetUserId.trim()) {
      setAdjustResultMsg({ type: 'error', text: 'Please enter a valid User ID or Email.' });
      return;
    }
    if (!amt || amt <= 0) {
      setAdjustResultMsg({ type: 'error', text: 'Please enter a positive GP amount.' });
      return;
    }

    setIsSubmittingAdjust(true);
    setAdjustResultMsg(null);

    try {
      const delta = adjustAction === 'add' ? amt : -amt;
      const adminUid = userProfile?.id || currentUser.id || 'admin';
      const adminName = userProfile?.name || currentUser.name || 'System Admin';

      const res = await adjustUserGpInFirestore(
        targetUserId.trim(),
        delta,
        adjustReason || `Manual administrative ${adjustAction === 'add' ? 'credit' : 'deduction'} of ${amt} GP`,
        adminUid,
        adminName
      );

      if (res.success) {
        setAdjustResultMsg({
          type: 'success',
          text: `Successfully ${adjustAction === 'add' ? 'credited' : 'debited'} ${amt.toLocaleString()} GP. New balance: ${res.newBalance.toLocaleString()} GP.`,
        });
        setAdjustAmount('');
        setAdjustReason('');
        setTimeout(() => {
          setIsAdjustModalOpen(false);
          setAdjustResultMsg(null);
        }, 2000);
      } else {
        setAdjustResultMsg({ type: 'error', text: res.error || 'Failed to adjust user GP balance.' });
      }
    } catch (err: any) {
      setAdjustResultMsg({ type: 'error', text: err?.message || 'An error occurred during adjustment.' });
    } finally {
      setIsSubmittingAdjust(false);
    }
  };

  const getTypeBadge = (type: string) => {
    switch (type) {
      case 'gp_earned':
        return {
          label: 'Dome Speed Quiz',
          icon: Award,
          bg: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20',
        };
      case 'GUS_PRIZE':
      case 'reward':
        return {
          label: 'Prize & Reward',
          icon: Sparkles,
          bg: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20',
        };
      case 'badge_purchase':
        return {
          label: 'Badge Store',
          icon: Layers,
          bg: 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20',
        };
      case 'gp_withdrawal':
        return {
          label: 'Cash Out Withdrawal',
          icon: ArrowDownRight,
          bg: 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20',
        };
      case 'vtu_purchase':
      case 'vtu_redemption':
        return {
          label: 'Airtime / Data VTU',
          icon: Smartphone,
          bg: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20',
        };
      case 'subscription_purchase':
        return {
          label: 'Academic Upgrade',
          icon: Zap,
          bg: 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20',
        };
      case 'admin_adjustment':
        return {
          label: 'Admin Adjustment',
          icon: ShieldAlert,
          bg: 'bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border-cyan-500/20',
        };
      case 'grant':
      case 'welcome_bonus':
        return {
          label: 'Grant / Bonus',
          icon: Coins,
          bg: 'bg-teal-500/10 text-teal-600 dark:text-teal-400 border-teal-500/20',
        };
      default:
        return {
          label: type.replace(/_/g, ' ').toUpperCase(),
          icon: Receipt,
          bg: 'bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-500/20',
        };
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 rounded-2xl bg-gradient-to-r from-slate-900 via-blue-950 to-slate-900 text-white border border-blue-900/50 shadow-lg">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black tracking-wider uppercase bg-blue-500/20 text-blue-300 border border-blue-400/30">
              Live Firestore Ledger
            </span>
            <span className="text-xs text-slate-400">Real-Time Platform Audit</span>
          </div>
          <h2 className="text-2xl font-black tracking-tight flex items-center gap-2.5">
            <Receipt className="w-6 h-6 text-blue-400" />
            Central Transaction Log
          </h2>
          <p className="text-xs text-slate-300 max-w-xl">
            Live authoritative record of all GP additions, quiz earnings, VTU redemptions, badge purchases, cash-out withdrawals, and administrative balance adjustments across all platform users.
          </p>
        </div>

        <div className="flex items-center gap-3 shrink-0 flex-wrap">
          <button
            onClick={() => setIsAdjustModalOpen(true)}
            className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition flex items-center gap-2 shadow-md shadow-blue-600/30 cursor-pointer"
          >
            <Coins className="w-4 h-4" />
            Adjust User GP
          </button>
          <button
            onClick={handleExportCSV}
            className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold transition border border-slate-700 flex items-center gap-2 cursor-pointer"
          >
            <Download className="w-4 h-4" />
            Export CSV
          </button>
        </div>
      </div>

      {/* Aggregate Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs mb-2">
            <span className="font-semibold">Total Logged Entries</span>
            <Receipt className="w-4 h-4 text-blue-500" />
          </div>
          <div className="text-2xl font-black text-slate-900 dark:text-white">
            {transactions.length.toLocaleString()}
          </div>
          <div className="text-[11px] text-slate-400 mt-1">
            {filteredTransactions.length} matching current filters
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs mb-2">
            <span className="font-semibold">Total GP Credited (+)</span>
            <ArrowUpRight className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400">
            +{totalCredits.toLocaleString()} <span className="text-xs font-normal">GP</span>
          </div>
          <div className="text-[11px] text-emerald-500/80 mt-1 flex items-center gap-1">
            <TrendingUp className="w-3 h-3" />
            Quizzes, rewards & admin grants
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs mb-2">
            <span className="font-semibold">Total GP Debited (-)</span>
            <ArrowDownRight className="w-4 h-4 text-rose-500" />
          </div>
          <div className="text-2xl font-black text-rose-600 dark:text-rose-400">
            -{totalDebits.toLocaleString()} <span className="text-xs font-normal">GP</span>
          </div>
          <div className="text-[11px] text-rose-500/80 mt-1 flex items-center gap-1">
            <TrendingDown className="w-3 h-3" />
            Cash-outs, VTU & badge purchases
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs mb-2">
            <span className="font-semibold">Platform Net GP Flow</span>
            <Coins className="w-4 h-4 text-amber-500" />
          </div>
          <div className={`text-2xl font-black ${netFlow >= 0 ? 'text-blue-600 dark:text-blue-400' : 'text-amber-600 dark:text-amber-400'}`}>
            {netFlow >= 0 ? '+' : ''}{netFlow.toLocaleString()} <span className="text-xs font-normal">GP</span>
          </div>
          <div className="text-[11px] text-slate-400 mt-1">
            Authoritative circulating balance
          </div>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
        <div className="flex flex-col md:flex-row items-center gap-3">
          {/* Search Input */}
          <div className="relative flex-1 w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search user name, username, transaction ID, institution, description..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Direction Filter */}
          <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl border border-slate-200 dark:border-slate-700 shrink-0">
            <button
              onClick={() => setSelectedDirection('all')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                selectedDirection === 'all'
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              All Flow
            </button>
            <button
              onClick={() => setSelectedDirection('credit')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1 cursor-pointer ${
                selectedDirection === 'credit'
                  ? 'bg-emerald-500 text-white shadow-xs'
                  : 'text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/10'
              }`}
            >
              <ArrowUpRight className="w-3 h-3" />
              Credits (+)
            </button>
            <button
              onClick={() => setSelectedDirection('debit')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1 cursor-pointer ${
                selectedDirection === 'debit'
                  ? 'bg-rose-500 text-white shadow-xs'
                  : 'text-rose-600 dark:text-rose-400 hover:bg-rose-500/10'
              }`}
            >
              <ArrowDownRight className="w-3 h-3" />
              Debits (-)
            </button>
          </div>
        </div>

        {/* Secondary Filters */}
        <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-100 dark:border-slate-800 text-xs">
          {/* Type Selector */}
          <div className="flex items-center gap-1.5">
            <span className="text-slate-400 font-semibold text-[11px]">Type:</span>
            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
              className="px-2.5 py-1.5 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-xs focus:ring-1 focus:ring-blue-500 focus:outline-none"
            >
              <option value="all">All Types</option>
              <option value="quiz">Dome Speed Quizzes (gp_earned)</option>
              <option value="vtu">Airtime & Mobile Data (VTU)</option>
              <option value="withdrawal">Cash Out Withdrawals</option>
              <option value="badge">Badge Store Purchases</option>
              <option value="admin">Admin GP Adjustments</option>
              <option value="subscription">Subscription Upgrades</option>
              <option value="reward">Prizes & Grants</option>
            </select>
          </div>

          {/* Status Selector */}
          <div className="flex items-center gap-1.5">
            <span className="text-slate-400 font-semibold text-[11px]">Status:</span>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="px-2.5 py-1.5 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-xs focus:ring-1 focus:ring-blue-500 focus:outline-none"
            >
              <option value="all">All Statuses</option>
              <option value="completed">Completed</option>
              <option value="pending">Pending</option>
              <option value="failed">Failed</option>
            </select>
          </div>

          {/* Date Range Selector */}
          <div className="flex items-center gap-1.5">
            <span className="text-slate-400 font-semibold text-[11px]">Time:</span>
            <select
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value as any)}
              className="px-2.5 py-1.5 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-xs focus:ring-1 focus:ring-blue-500 focus:outline-none"
            >
              <option value="all">All Time</option>
              <option value="today">Today</option>
              <option value="7days">Past 7 Days</option>
              <option value="30days">Past 30 Days</option>
            </select>
          </div>

          {/* Sort Selector */}
          <div className="flex items-center gap-1.5 ml-auto">
            <span className="text-slate-400 font-semibold text-[11px]">Sort:</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="px-2.5 py-1.5 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-xs focus:ring-1 focus:ring-blue-500 focus:outline-none"
            >
              <option value="newest">Newest First</option>
              <option value="oldest">Oldest First</option>
              <option value="highest">Highest Amount</option>
              <option value="lowest">Lowest Amount</option>
            </select>
          </div>
        </div>
      </div>

      {/* Transactions Table / Feed */}
      <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        {filteredTransactions.length === 0 ? (
          <div className="py-16 px-6 text-center space-y-3">
            <div className="w-14 h-14 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center mx-auto text-slate-400">
              <Receipt className="w-7 h-7" />
            </div>
            <h3 className="font-bold text-slate-800 dark:text-slate-200 text-base">
              No Transactions Found
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto">
              {transactions.length === 0
                ? 'No transactions have been logged in the system yet. When users earn or spend GP, real entries will appear here automatically.'
                : 'No transaction entries match your current search and filter settings. Try adjusting your filters above.'}
            </p>
            {transactions.length > 0 && (
              <button
                onClick={() => {
                  setSearchTerm('');
                  setSelectedType('all');
                  setSelectedDirection('all');
                  setSelectedStatus('all');
                  setDateRange('all');
                }}
                className="px-4 py-2 rounded-xl bg-blue-600 text-white font-bold text-xs hover:bg-blue-500 transition cursor-pointer"
              >
                Clear All Filters
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50/80 dark:bg-slate-800/60 text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800 uppercase text-[10px] tracking-wider font-semibold">
                  <th className="py-3.5 px-4">Transaction / User</th>
                  <th className="py-3.5 px-4">Type & Category</th>
                  <th className="py-3.5 px-4">Description / Details</th>
                  <th className="py-3.5 px-4 text-right">Amount (GP)</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4 text-right">Date & Time</th>
                  <th className="py-3.5 px-4 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filteredTransactions.map((tx) => {
                  const badge = getTypeBadge(tx.type);
                  const Icon = badge.icon;
                  const isCredit = tx.isCredit;

                  return (
                    <tr
                      key={tx.id || tx.transactionId}
                      className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition"
                    >
                      {/* User & Ref */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-start gap-2.5">
                          <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white font-bold text-xs shrink-0 overflow-hidden shadow-xs">
                            {tx.userAvatar ? (
                              <img src={tx.userAvatar} alt="avatar" className="w-full h-full object-cover" />
                            ) : (
                              <User className="w-4 h-4 text-white" />
                            )}
                          </div>
                          <div>
                            <div className="font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                              <span>{tx.userName || 'Scholar'}</span>
                              {tx.institutionName && (
                                <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-100 dark:bg-slate-800 text-slate-500 font-normal">
                                  {tx.institutionName}
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-1.5 text-[11px] text-slate-400 font-mono mt-0.5">
                              <span>{tx.transactionId || tx.id}</span>
                              <button
                                onClick={() => handleCopy(tx.transactionId || tx.id, tx.id)}
                                className="text-slate-400 hover:text-blue-500 transition cursor-pointer"
                                title="Copy Reference ID"
                              >
                                {copiedId === tx.id ? (
                                  <Check className="w-3 h-3 text-emerald-500" />
                                ) : (
                                  <Copy className="w-3 h-3" />
                                )}
                              </button>
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Type Badge */}
                      <td className="py-3.5 px-4">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-bold border ${badge.bg}`}
                        >
                          <Icon className="w-3.5 h-3.5 shrink-0" />
                          <span>{badge.label}</span>
                        </span>
                      </td>

                      {/* Description & Note */}
                      <td className="py-3.5 px-4 max-w-xs">
                        <div className="font-semibold text-slate-800 dark:text-slate-200 truncate">
                          {tx.title}
                        </div>
                        <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate mt-0.5">
                          {tx.description}
                        </div>
                        {tx.reason && tx.reason !== tx.description && (
                          <div className="text-[10px] text-blue-600 dark:text-blue-400 font-medium italic mt-0.5 truncate">
                            Note: {tx.reason}
                          </div>
                        )}
                      </td>

                      {/* Amount */}
                      <td className="py-3.5 px-4 text-right">
                        <div
                          className={`text-sm font-black tracking-tight ${
                            isCredit
                              ? 'text-emerald-600 dark:text-emerald-400'
                              : 'text-rose-600 dark:text-rose-400'
                          }`}
                        >
                          {isCredit ? '+' : '-'}{Number(tx.amount).toLocaleString()} {tx.unit || 'GP'}
                        </div>
                        <div className="text-[10px] text-slate-400 mt-0.5">
                          {isCredit ? 'Credit Inflow' : 'Debit Outflow'}
                        </div>
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-4">
                        {tx.status === 'completed' ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                            <CheckCircle2 className="w-3 h-3" />
                            Completed
                          </span>
                        ) : tx.status === 'pending' ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                            <Clock className="w-3 h-3" />
                            Pending
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20">
                            <XCircle className="w-3 h-3" />
                            Failed
                          </span>
                        )}
                      </td>

                      {/* Date */}
                      <td className="py-3.5 px-4 text-right text-slate-500 dark:text-slate-400 text-[11px] whitespace-nowrap">
                        <div>{tx.date || 'Recent'}</div>
                      </td>

                      {/* Action */}
                      <td className="py-3.5 px-4 text-center">
                        <button
                          onClick={() => setSelectedTxDetail(tx)}
                          className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition cursor-pointer"
                          title="Inspect Transaction Details"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Transaction Details Modal */}
      {selectedTxDetail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="relative w-full max-w-lg bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400">
                  <Receipt className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 dark:text-slate-100 text-base">
                    Transaction Audit Inspector
                  </h3>
                  <div className="text-[11px] text-slate-400 font-mono">
                    {selectedTxDetail.transactionId || selectedTxDetail.id}
                  </div>
                </div>
              </div>
              <button
                onClick={() => setSelectedTxDetail(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 flex items-center justify-between">
                <div>
                  <div className="text-[11px] text-slate-400 font-semibold uppercase">Amount & Flow</div>
                  <div
                    className={`text-2xl font-black mt-0.5 ${
                      selectedTxDetail.isCredit
                        ? 'text-emerald-600 dark:text-emerald-400'
                        : 'text-rose-600 dark:text-rose-400'
                    }`}
                  >
                    {selectedTxDetail.isCredit ? '+' : '-'}{Number(selectedTxDetail.amount).toLocaleString()} {selectedTxDetail.unit || 'GP'}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-[11px] text-slate-400 font-semibold uppercase">Status</div>
                  <div className="mt-1">
                    <span
                      className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold ${
                        selectedTxDetail.status === 'completed'
                          ? 'bg-emerald-500/10 text-emerald-600 border border-emerald-500/20'
                          : selectedTxDetail.status === 'pending'
                          ? 'bg-amber-500/10 text-amber-600 border border-amber-500/20'
                          : 'bg-rose-500/10 text-rose-600 border border-rose-500/20'
                      }`}
                    >
                      {selectedTxDetail.status}
                    </span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700/60">
                  <div className="text-[10px] text-slate-400 font-semibold uppercase">User Name</div>
                  <div className="font-bold text-slate-900 dark:text-slate-100 mt-0.5 truncate">
                    {selectedTxDetail.userName || 'Scholar'}
                  </div>
                </div>
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700/60">
                  <div className="text-[10px] text-slate-400 font-semibold uppercase">User ID</div>
                  <div className="font-mono text-slate-600 dark:text-slate-300 mt-0.5 truncate">
                    {selectedTxDetail.userId || 'N/A'}
                  </div>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700/60 space-y-1">
                <div className="text-[10px] text-slate-400 font-semibold uppercase">Title & Category</div>
                <div className="font-bold text-slate-900 dark:text-slate-100">{selectedTxDetail.title}</div>
                <div className="text-slate-500 dark:text-slate-400">{selectedTxDetail.description}</div>
              </div>

              {selectedTxDetail.reason && (
                <div className="p-3 rounded-xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800/60 space-y-1">
                  <div className="text-[10px] text-blue-500 font-semibold uppercase">Admin Reason / Notes</div>
                  <div className="text-blue-900 dark:text-blue-300">{selectedTxDetail.reason}</div>
                  {selectedTxDetail.adminName && (
                    <div className="text-[10px] text-slate-400 mt-1">
                      Authorized by: <strong className="text-blue-600 dark:text-blue-400">{selectedTxDetail.adminName}</strong>
                    </div>
                  )}
                </div>
              )}

              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700/60 flex justify-between items-center text-slate-500">
                <span>Recorded Date:</span>
                <span className="font-semibold text-slate-700 dark:text-slate-300">{selectedTxDetail.date || 'Recent'}</span>
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                onClick={() => setSelectedTxDetail(null)}
                className="px-5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold text-xs transition cursor-pointer"
              >
                Close Inspector
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Manual GP Adjustment Modal */}
      {isAdjustModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="relative w-full max-w-md bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400">
                  <Coins className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 dark:text-slate-100 text-base">
                    Manual GP Adjustment
                  </h3>
                  <div className="text-[11px] text-slate-400">Add or deduct GP directly in Firestore</div>
                </div>
              </div>
              <button
                onClick={() => {
                  setIsAdjustModalOpen(false);
                  setAdjustResultMsg(null);
                }}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {adjustResultMsg && (
              <div
                className={`p-3 rounded-xl text-xs flex items-center gap-2 ${
                  adjustResultMsg.type === 'success'
                    ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                    : 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20'
                }`}
              >
                {adjustResultMsg.type === 'success' ? (
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                ) : (
                  <ShieldAlert className="w-4 h-4 shrink-0" />
                )}
                <span>{adjustResultMsg.text}</span>
              </div>
            )}

            <form onSubmit={handlePerformAdjustment} className="space-y-4 text-xs">
              {/* Action Selection (Credit or Debit) */}
              <div className="space-y-1.5">
                <label className="font-semibold text-slate-700 dark:text-slate-300">
                  Adjustment Direction
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setAdjustAction('add')}
                    className={`py-2.5 px-3 rounded-xl font-bold flex items-center justify-center gap-2 border transition cursor-pointer ${
                      adjustAction === 'add'
                        ? 'bg-emerald-500/10 border-emerald-500 text-emerald-600 dark:text-emerald-400'
                        : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    <PlusCircle className="w-4 h-4" />
                    Credit User (+)
                  </button>
                  <button
                    type="button"
                    onClick={() => setAdjustAction('deduct')}
                    className={`py-2.5 px-3 rounded-xl font-bold flex items-center justify-center gap-2 border transition cursor-pointer ${
                      adjustAction === 'deduct'
                        ? 'bg-rose-500/10 border-rose-500 text-rose-600 dark:text-rose-400'
                        : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    <MinusCircle className="w-4 h-4" />
                    Deduct User (-)
                  </button>
                </div>
              </div>

              {/* Target User UID */}
              <div className="space-y-1.5">
                <label className="font-semibold text-slate-700 dark:text-slate-300">
                  Target User ID (UID)
                </label>
                <input
                  type="text"
                  placeholder="e.g. iH02BTcB4B0BV2YLA60WwFAi50CJ3"
                  value={targetUserId}
                  onChange={(e) => setTargetUserId(e.target.value)}
                  required
                  className="w-full px-3 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-mono text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              {/* Amount */}
              <div className="space-y-1.5">
                <label className="font-semibold text-slate-700 dark:text-slate-300">
                  GP Amount to {adjustAction === 'add' ? 'Credit' : 'Deduct'}
                </label>
                <div className="relative">
                  <input
                    type="number"
                    min="1"
                    step="1"
                    placeholder="e.g. 500"
                    value={adjustAmount}
                    onChange={(e) => setAdjustAmount(e.target.value)}
                    required
                    className="w-full pl-3 pr-10 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-bold text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-xs">
                    GP
                  </span>
                </div>
              </div>

              {/* Reason */}
              <div className="space-y-1.5">
                <label className="font-semibold text-slate-700 dark:text-slate-300">
                  Reason / Audit Note
                </label>
                <textarea
                  rows={2}
                  placeholder="e.g. Campus Ambassador performance bonus, manual reversal..."
                  value={adjustReason}
                  onChange={(e) => setAdjustReason(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none resize-none"
                />
              </div>

              <div className="pt-2 flex gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setIsAdjustModalOpen(false);
                    setAdjustResultMsg(null);
                  }}
                  className="flex-1 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 font-bold hover:bg-slate-50 dark:hover:bg-slate-800 transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingAdjust}
                  className={`flex-1 py-2.5 rounded-xl font-black text-white shadow-lg transition cursor-pointer ${
                    adjustAction === 'add'
                      ? 'bg-emerald-600 hover:bg-emerald-500 shadow-emerald-600/20'
                      : 'bg-rose-600 hover:bg-rose-500 shadow-rose-600/20'
                  } disabled:opacity-50`}
                >
                  {isSubmittingAdjust
                    ? 'Processing...'
                    : `Confirm ${adjustAction === 'add' ? 'Credit' : 'Deduction'}`}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
