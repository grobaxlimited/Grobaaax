import React, { useState, useEffect } from 'react';
import { db, collection, getDocs, query, where, limit } from '../../lib/firebase';
import { PRIMARY_SUPER_ADMIN_UID } from '../../types';
import { useApp } from '../../context/AppContext';
import { NotificationBadge } from '../ui/NotificationBadge';
import {
  Users,
  Wallet,
  ShieldCheck,
  Trophy,
  Award,
  Zap,
  TrendingUp,
  Activity,
  CheckCircle2,
  AlertCircle,
  ArrowUpRight,
  Sparkles,
  Building,
  Calendar,
  Layers,
  Receipt,
  RefreshCw,
  BookOpen,
  ChevronRight,
} from 'lucide-react';

interface AdminDashboardProps {
  onNavigateTab: (tab: any) => void;
}

export function AdminDashboardView({ onNavigateTab }: AdminDashboardProps) {
  const { currentUser, firebaseUser, adminSectionNotifications, pendingPastQuestionsCount } = useApp();
  const [userCount, setUserCount] = useState<number>(0);
  const [totalGpCirculation, setTotalGpCirculation] = useState<number>(0);
  const [managerCount, setManagerCount] = useState<number>(0);
  const [pendingWithdrawalsCount, setPendingWithdrawalsCount] = useState<number>(0);
  const [institutionsCount, setInstitutionsCount] = useState<number>(0);
  const [activeSeasonsCount, setActiveSeasonsCount] = useState<number>(0);
  const [loading, setLoading] = useState(false);

  const activeAdminUid = currentUser?.id || currentUser?.uid || firebaseUser?.uid || PRIMARY_SUPER_ADMIN_UID;
  const activeAdminName = currentUser?.name || currentUser?.fullName || firebaseUser?.displayName || 'Super Admin';

  const loadDashboardMetrics = async () => {
    setLoading(true);
    try {
      // 1. Fetch users summary with limit(50)
      const userSnap = await getDocs(query(collection(db, 'users'), limit(50)));
      setUserCount(userSnap.size);
      let totalGp = 0;
      userSnap.forEach((doc) => {
        const data = doc.data();
        totalGp += Number(data.gpBalance || 0);
      });
      setTotalGpCirculation(totalGp);

      // 2. Fetch managers with limit(20)
      const managerSnap = await getDocs(query(collection(db, 'managerAssignments'), limit(20)));
      setManagerCount(managerSnap.size || 1);

      // 3. Fetch pending withdrawals with limit(30)
      const withdrawalSnap = await getDocs(query(collection(db, 'withdrawals'), where('status', '==', 'Pending'), limit(30)));
      setPendingWithdrawalsCount(withdrawalSnap.size);

      // 4. Fetch institutions with limit(50)
      const instSnap = await getDocs(query(collection(db, 'institutions'), limit(50)));
      setInstitutionsCount(instSnap.size);
    } catch (err: any) {
      console.warn('Dashboard metrics fetch notice:', err?.message || err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboardMetrics();
  }, []);

  return (
    <div className="space-y-6">
      {/* Super Admin Welcome Banner */}
      <div className="p-6 md:p-8 rounded-3xl bg-gradient-to-r from-blue-950 via-slate-900 to-blue-950 text-white shadow-2xl border border-blue-500/30 relative overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          <div>
            <div className="flex items-center space-x-3 mb-2">
              <span className="px-3 py-1 rounded-full text-xs font-black bg-blue-500/30 text-blue-200 border border-blue-400/30 uppercase tracking-widest flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-amber-400" /> Primary Super Admin Control Center
              </span>
              <span className="px-2.5 py-0.5 rounded-md text-[10px] font-mono bg-slate-800 text-blue-300 border border-blue-500/20">
                UID: {activeAdminUid}
              </span>
            </div>
            <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight text-white">
              {activeAdminName}'s Master Administration System
            </h1>
            <p className="text-blue-200 text-sm mt-2 max-w-2xl">
              Connected to existing Grobaax Firebase backend. Monitor platform vitals, user wallets, institutional competitions, and role permissions.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={() => onNavigateTab('events')}
              className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-2 shadow-lg transition"
            >
              <Calendar className="w-4 h-4" /> Events Catalog
            </button>
            <button
              onClick={() => onNavigateTab('managers')}
              className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs flex items-center gap-2 shadow-lg transition"
            >
              <ShieldCheck className="w-4 h-4" /> Manage Roles
            </button>
            <button
              onClick={() => onNavigateTab('subscriptions')}
              className="px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs flex items-center gap-2 shadow-lg transition"
            >
              <Zap className="w-4 h-4" /> Subscriptions (₦)
            </button>
          </div>
        </div>
      </div>

      {/* Vitals Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <div
          onClick={() => onNavigateTab('users')}
          className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm hover:border-blue-500 transition cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Registered Users</span>
            <div className="p-2.5 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 group-hover:scale-110 transition">
              <Users className="w-5 h-5" />
            </div>
          </div>
          <div className="text-3xl font-extrabold text-slate-900 dark:text-white mt-2">
            {userCount.toLocaleString()}
          </div>
          <div className="flex items-center space-x-1 text-xs text-emerald-500 font-semibold mt-2">
            <TrendingUp className="w-3.5 h-3.5" />
            <span>Synced with Firebase</span>
          </div>
        </div>

        <div
          onClick={() => onNavigateTab('wallet')}
          className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm hover:border-amber-500 transition cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total GP Balance</span>
            <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-500 group-hover:scale-110 transition">
              <Wallet className="w-5 h-5" />
            </div>
          </div>
          <div className="text-3xl font-extrabold text-amber-500 mt-2">
            {totalGpCirculation.toLocaleString()} GP
          </div>
          <div className="text-xs text-slate-400 font-medium mt-2">
            Live Circulation across user wallets
          </div>
        </div>

        <div
          onClick={() => onNavigateTab('withdrawals')}
          className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm hover:border-rose-500 transition cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Pending Withdrawals</span>
            <div className="p-2.5 rounded-xl bg-rose-500/10 text-rose-500 group-hover:scale-110 transition">
              <AlertCircle className="w-5 h-5" />
            </div>
          </div>
          <div className="text-3xl font-extrabold text-slate-900 dark:text-white mt-2">
            {pendingWithdrawalsCount}
          </div>
          <div className="text-xs text-rose-500 font-semibold mt-2">
            Requires Manager Review
          </div>
        </div>

        <div
          onClick={() => onNavigateTab('managers')}
          className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm hover:border-indigo-500 transition cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Active Managers</span>
            <div className="p-2.5 rounded-xl bg-indigo-500/10 text-indigo-500 group-hover:scale-110 transition">
              <ShieldCheck className="w-5 h-5" />
            </div>
          </div>
          <div className="text-3xl font-extrabold text-slate-900 dark:text-white mt-2">
            {managerCount}
          </div>
          <div className="text-xs text-indigo-400 font-semibold mt-2">
            Assigned RBAC Roles
          </div>
        </div>
      </div>

      {/* Quick Access Shortcuts Grid */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm">
        <h3 className="text-base font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
          <Layers className="w-5 h-5 text-blue-500" /> Quick Administrative Control Modules
        </h3>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          { [
            { label: 'User Accounts', tab: 'users', icon: Users, color: 'text-blue-500 bg-blue-500/10' },
            { label: 'Roles & RBAC', tab: 'managers', icon: ShieldCheck, color: 'text-indigo-500 bg-indigo-500/10' },
            { label: 'Events Catalog', tab: 'events', icon: Calendar, color: 'text-cyan-500 bg-cyan-500/10' },
            { label: 'Subscriptions (₦)', tab: 'subscriptions', icon: Zap, color: 'text-amber-500 bg-amber-500/10' },
            { label: 'Sponsorship & Ads', tab: 'sponsorship', icon: Sparkles, color: 'text-amber-500 bg-amber-500/10' },
            { label: 'Live Search Chat', tab: 'chatroom_live', icon: Trophy, color: 'text-purple-500 bg-purple-500/10' },
            { label: 'Withdrawals', tab: 'withdrawals', icon: Wallet, color: 'text-rose-500 bg-rose-500/10' },
            { label: 'AI Handout Library', tab: 'library', icon: BookOpen, color: 'text-teal-500 bg-teal-500/10' },
            { label: 'Airtime & Data', tab: 'airtime_data', icon: Activity, color: 'text-slate-500 bg-slate-500/10' },
            { label: 'Transactions Log', tab: 'transactions', icon: Receipt, color: 'text-emerald-500 bg-emerald-500/10' },
          ].map((item, idx) => {
            const Icon = item.icon;
            const unreadCount = adminSectionNotifications?.[item.tab as any] || 0;
            return (
              <button
                key={idx}
                id={`admin-dash-quick-${item.tab}`}
                onClick={() => onNavigateTab(item.tab)}
                className="relative p-4 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 hover:bg-blue-600 hover:text-white transition flex flex-col items-center text-center gap-2 group cursor-pointer"
              >
                {unreadCount > 0 && (
                  <NotificationBadge
                    count={unreadCount}
                    className="absolute top-2 right-2 shadow-xs"
                  />
                )}
                <div className={`p-2.5 rounded-xl ${item.color} group-hover:bg-white/20 group-hover:text-white transition`}>
                  <Icon className="w-5 h-5" />
                </div>
                <span className="text-xs font-bold">{item.label}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
