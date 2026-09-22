import React, { useState, useEffect } from 'react';
import { WithdrawalRecord, PRIMARY_SUPER_ADMIN_UID } from '../../types';
import { db, collection, onSnapshot, doc, updateDoc, increment, addDoc, serverTimestamp } from '../../lib/firebase';
import { logManagerActivity } from '../../lib/adminPermissions';
import { useApp } from '../../context/AppContext';
import { Wallet, CheckCircle2, XCircle, AlertCircle, RefreshCw, DollarSign, Clock, ArrowUpRight, CheckCheck } from 'lucide-react';

export function AdminWithdrawalsView() {
  const { userProfile, markSectionAsRead, withdrawals: contextWithdrawals } = useApp();
  const [withdrawals, setWithdrawals] = useState<WithdrawalRecord[]>(contextWithdrawals || []);
  const [loading, setLoading] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  // Clear unread notification badge on view load
  useEffect(() => {
    if (markSectionAsRead) {
      markSectionAsRead('withdrawals');
      markSectionAsRead('admin_withdrawals');
    }
  }, [markSectionAsRead]);

  // Sync withdrawals from AppContext
  useEffect(() => {
    if (contextWithdrawals) {
      setWithdrawals(contextWithdrawals);
    }
  }, [contextWithdrawals]);

  const handleMarkAllReviewed = () => {
    if (markSectionAsRead) {
      markSectionAsRead('withdrawals');
      markSectionAsRead('admin_withdrawals');
    }
  };

  const handleUpdateStatus = async (
    withdrawal: WithdrawalRecord,
    newStatus: 'Approved' | 'Paid' | 'Rejected'
  ) => {
    try {
      const ref = doc(db, 'withdrawals', withdrawal.id);
      await updateDoc(ref, {
        status: newStatus,
        updatedAt: new Date().toISOString(),
      });

      // If rejected, refund GP to user wallet
      if (newStatus === 'Rejected' && withdrawal.userId) {
        const userRef = doc(db, 'users', withdrawal.userId);
        await updateDoc(userRef, {
          gpBalance: increment(withdrawal.amountGP),
          updatedAt: new Date().toISOString(),
        });

        // Add authoritative transaction log
        const dateStr = new Date().toLocaleDateString('en-US', {
          month: 'short',
          day: '2-digit',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        });
        await addDoc(collection(db, 'walletTransactions'), {
          userId: withdrawal.userId,
          userName: withdrawal.username || withdrawal.accountName || 'Scholar',
          userAvatar: withdrawal.userAvatar || '',
          type: 'gp_earned',
          amount: withdrawal.amountGP,
          unit: 'GP',
          title: 'Withdrawal Refund',
          description: `Refund for rejected withdrawal reference #${withdrawal.reference || withdrawal.id}`,
          isCredit: true,
          status: 'completed',
          transactionId: 'TX-RFD-' + Math.floor(100000 + Math.random() * 900000),
          date: dateStr,
          createdAt: serverTimestamp(),
        });
      }

      await logManagerActivity({
        managerUid: userProfile?.id || PRIMARY_SUPER_ADMIN_UID,
        managerName: userProfile?.name || 'Wallet Manager',
        managerEmail: userProfile?.username || 'admin@grobaax.app',
        role: userProfile?.role || 'WALLET_MANAGER',
        action: `WITHDRAWAL_${newStatus.toUpperCase()}`,
        target: 'withdrawals',
        targetId: withdrawal.id,
        previousValue: { status: withdrawal.status },
        newValue: { status: newStatus },
      });
    } catch (err) {
      console.error('Error updating withdrawal status:', err);
    }
  };

  const filtered = withdrawals.filter((w) =>
    statusFilter === 'ALL' ? true : w.status.toLowerCase() === statusFilter.toLowerCase()
  );

  return (
    <div className="space-y-6">
      <div className="p-6 rounded-2xl bg-gradient-to-r from-rose-900 via-blue-900 to-slate-900 text-white flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Wallet className="w-7 h-7 text-rose-400" /> Student GP Withdrawal Requests
          </h1>
          <p className="text-xs text-rose-200 mt-1">
            Review, approve, reject, or mark paid student GP to Naira (₦) withdrawal requests.
          </p>
        </div>
      </div>

      <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 rounded-lg bg-slate-100 dark:bg-slate-800 text-xs font-medium text-slate-800 dark:text-slate-100 cursor-pointer"
          >
            <option value="ALL">All Statuses</option>
            <option value="Pending">Pending</option>
            <option value="Approved">Approved</option>
            <option value="Paid">Paid</option>
            <option value="Rejected">Rejected</option>
          </select>

          <button
            onClick={handleMarkAllReviewed}
            className="px-3 py-2 rounded-lg bg-blue-50 dark:bg-blue-950/50 hover:bg-blue-100 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-800 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
            title="Acknowledge and clear withdrawal unread signal badge"
          >
            <CheckCheck className="w-3.5 h-3.5" />
            <span>Mark All Reviewed</span>
          </button>
        </div>

        <span className="text-xs text-slate-400 font-semibold">Total Requests: {filtered.length}</span>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
        {loading ? (
          <div className="p-12 text-center">
            <RefreshCw className="w-8 h-8 text-blue-600 animate-spin mx-auto" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center text-xs text-slate-400">No withdrawal requests match status filter.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-800/50 text-slate-500 uppercase font-semibold">
                <tr>
                  <th className="p-3.5">User</th>
                  <th className="p-3.5">GP Amount</th>
                  <th className="p-3.5">Fiat NGN (₦)</th>
                  <th className="p-3.5">Bank Details</th>
                  <th className="p-3.5">Date</th>
                  <th className="p-3.5">Status</th>
                  <th className="p-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-800 dark:text-slate-200">
                {filtered.map((w) => (
                  <tr key={w.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30">
                    <td className="p-3.5 font-bold">{w.username}</td>
                    <td className="p-3.5 font-extrabold text-amber-500">{w.amountGP.toLocaleString()} GP</td>
                    <td className="p-3.5 font-extrabold text-emerald-600 dark:text-emerald-400">{w.fiatValue}</td>
                    <td className="p-3.5">
                      <div>{w.bankName} • {w.accountNumber}</div>
                      <div className="text-[10px] text-slate-400">{w.accountName}</div>
                    </td>
                    <td className="p-3.5 text-slate-400">{new Date(w.requestDate).toLocaleDateString()}</td>
                    <td className="p-3.5">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-blue-500/10 text-blue-600">
                        {w.status}
                      </span>
                    </td>
                    <td className="p-3.5 text-right space-x-1">
                      {w.status === 'Pending' && (
                        <>
                          <button
                            onClick={() => handleUpdateStatus(w, 'Approved')}
                            className="px-2.5 py-1 bg-emerald-600 text-white rounded text-[10px] font-bold"
                          >
                            Approve
                          </button>
                          <button
                            onClick={() => handleUpdateStatus(w, 'Rejected')}
                            className="px-2.5 py-1 bg-rose-600 text-white rounded text-[10px] font-bold"
                          >
                            Reject & Refund
                          </button>
                        </>
                      )}
                      {w.status === 'Approved' && (
                        <button
                          onClick={() => handleUpdateStatus(w, 'Paid')}
                          className="px-2.5 py-1 bg-blue-600 text-white rounded text-[10px] font-bold"
                        >
                          Mark Paid
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
