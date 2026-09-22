import React, { useState, useEffect } from 'react';
import { ManagerAssignment, ManagerRole, ManagerActivityLog, UserProfile, PRIMARY_SUPER_ADMIN_UID } from '../../types';
import { db, collection, getDocs, doc, setDoc, deleteDoc, updateDoc, query, orderBy, limit } from '../../lib/firebase';
import {
  ALL_MANAGER_ROLES,
  ROLE_LABELS,
  ROLE_DESCRIPTIONS,
  isPrimarySuperAdmin,
  logManagerActivity,
} from '../../lib/adminPermissions';
import { useApp } from '../../context/AppContext';
import {
  ShieldCheck,
  UserPlus,
  Search,
  CheckCircle2,
  XCircle,
  Edit3,
  Trash2,
  Clock,
  Shield,
  RefreshCw,
  AlertTriangle,
  Lock,
  ChevronRight,
  Filter,
} from 'lucide-react';

export function AdminManagersView() {
  const { userProfile: currentUser } = useApp();
  const [managers, setManagers] = useState<ManagerAssignment[]>([]);
  const [logs, setLogs] = useState<ManagerActivityLog[]>([]);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<'managers' | 'logs' | 'roles'>('managers');

  // Search & Filter
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('ALL');

  // Add Manager Modal State
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [userSearchQuery, setUserSearchQuery] = useState('');
  const [selectedUserForManager, setSelectedUserForManager] = useState<UserProfile | null>(null);
  const [assignedRole, setAssignedRole] = useState<ManagerRole>('INSTITUTIONAL_LEAGUE_MANAGER');
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Edit Manager Role Modal
  const [editingManager, setEditingManager] = useState<ManagerAssignment | null>(null);
  const [editRole, setEditRole] = useState<ManagerRole>('INSTITUTIONAL_LEAGUE_MANAGER');

  const loadManagersData = async () => {
    try {
      setLoading(true);
      // 1. Fetch managers with limit(50)
      const managersRef = query(collection(db, 'managerAssignments'), limit(50));
      const managersSnap = await getDocs(managersRef);
      const loadedManagers: ManagerAssignment[] = [];
      managersSnap.forEach((docSnap) => {
        const data = docSnap.data();
        loadedManagers.push({
          id: docSnap.id,
          uid: data.uid || docSnap.id,
          email: data.email || 'manager@grobaax.app',
          name: data.name || 'Grobaax Manager',
          avatar: data.avatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${docSnap.id}`,
          role: data.role || 'ADMIN',
          permissions: data.permissions || [],
          status: data.status || 'active',
          assignedByUid: data.assignedByUid || PRIMARY_SUPER_ADMIN_UID,
          assignedByName: data.assignedByName || 'Primary Super Admin',
          assignedAt: data.assignedAt || new Date().toISOString(),
          updatedAt: data.updatedAt || new Date().toISOString(),
        });
      });

      // Always ensure Primary Super Admin is in the list
      const superAdminExists = loadedManagers.some((m) => m.uid === PRIMARY_SUPER_ADMIN_UID);
      if (!superAdminExists) {
        loadedManagers.unshift({
          id: PRIMARY_SUPER_ADMIN_UID,
          uid: PRIMARY_SUPER_ADMIN_UID,
          email: 'superadmin@grobaax.app',
          name: 'Primary Super Admin',
          avatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=superadmin',
          role: 'SUPER_ADMIN',
          permissions: ['*'],
          status: 'active',
          assignedByUid: PRIMARY_SUPER_ADMIN_UID,
          assignedByName: 'System Master Authority',
          assignedAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });
      }
      setManagers(loadedManagers);

      // 2. Fetch Activity logs with limit(50)
      const logsRef = query(collection(db, 'managerActivityLogs'), limit(50));
      const logsSnap = await getDocs(logsRef);
      const loadedLogs: ManagerActivityLog[] = [];
      logsSnap.forEach((docSnap) => {
        const data = docSnap.data();
        loadedLogs.push({
          id: docSnap.id,
          managerUid: data.managerUid || '',
          managerName: data.managerName || 'Manager',
          managerEmail: data.managerEmail || '',
          role: data.role || '',
          action: data.action || 'ACTION',
          date: data.date || '',
          time: data.time || '',
          target: data.target || '',
          targetId: data.targetId || '',
          previousValue: data.previousValue,
          newValue: data.newValue,
          timestamp: data.timestamp || Date.now(),
        });
      });
      loadedLogs.sort((a, b) => b.timestamp - a.timestamp);
      setLogs(loadedLogs);

      // 3. Fetch users for search with limit(50)
      const usersQuery = query(collection(db, 'users'), limit(50));
      const usersSnap = await getDocs(usersQuery);
      const loadedUsers: UserProfile[] = [];
      usersSnap.forEach((docSnap) => {
        const data = docSnap.data();
        loadedUsers.push({
          id: docSnap.id,
          name: data.name || 'Student',
          username: data.username || docSnap.id,
          avatar: data.avatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${docSnap.id}`,
          role: data.role || 'student',
          institution: data.institution || 'Unassigned',
          department: data.department || '',
          level: data.level || '',
          major: '',
          grbxTokens: 0,
          gpBalance: data.gpBalance || 0,
          stakedTokens: 0,
          reputationPoints: 100,
          gusRank: 0,
          gusTier: 'Scholar',
          walletAddress: '',
          bio: '',
          verified: false,
          privacy: {} as any,
          badges: [],
          purchasedBadgeIds: [],
        });
      });
      setUsers(loadedUsers);
    } catch (err) {
      console.warn('Notice fetching manager assignments (using fallback):', err);
      setManagers([
        {
          id: PRIMARY_SUPER_ADMIN_UID,
          uid: PRIMARY_SUPER_ADMIN_UID,
          email: 'superadmin@grobaax.app',
          name: 'Primary Super Admin',
          avatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=superadmin',
          role: 'SUPER_ADMIN',
          permissions: ['*'],
          status: 'active',
          assignedByUid: PRIMARY_SUPER_ADMIN_UID,
          assignedByName: 'System Master Authority',
          assignedAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ]);
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    loadManagersData();
  }, []);

  const handleAddManager = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUserForManager) {
      setMessage({ type: 'error', text: 'Please search and select a user to assign as Manager.' });
      return;
    }

    setIsSaving(true);
    setMessage(null);

    try {
      const managerData: Omit<ManagerAssignment, 'id'> = {
        uid: selectedUserForManager.id,
        email: selectedUserForManager.username ? `${selectedUserForManager.username}@grobaax.app` : 'user@grobaax.app',
        name: selectedUserForManager.name,
        avatar: selectedUserForManager.avatar,
        role: assignedRole,
        permissions: [assignedRole],
        status: 'active',
        assignedByUid: currentUser?.id || PRIMARY_SUPER_ADMIN_UID,
        assignedByName: currentUser?.name || 'Primary Super Admin',
        assignedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      await setDoc(doc(db, 'managerAssignments', selectedUserForManager.id), managerData);

      // Update user role to admin or manager
      await updateDoc(doc(db, 'users', selectedUserForManager.id), {
        role: 'admin',
        managerRole: assignedRole,
        updatedAt: new Date().toISOString(),
      });

      await logManagerActivity({
        managerUid: currentUser?.id || PRIMARY_SUPER_ADMIN_UID,
        managerName: currentUser?.name || 'Primary Super Admin',
        managerEmail: currentUser?.username || 'admin@grobaax.app',
        role: currentUser?.role || 'SUPER_ADMIN',
        action: 'ASSIGN_NEW_MANAGER',
        target: 'managerAssignments',
        targetId: selectedUserForManager.id,
        previousValue: null,
        newValue: managerData,
      });

      setMessage({
        type: 'success',
        text: `Successfully assigned ${selectedUserForManager.name} as ${ROLE_LABELS[assignedRole]}!`,
      });
      setIsAddModalOpen(false);
      setSelectedUserForManager(null);
      setUserSearchQuery('');
    } catch (err: any) {
      console.error('Error adding manager:', err);
      setMessage({ type: 'error', text: err.message || 'Failed to assign manager.' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleUpdateManagerRole = async () => {
    if (!editingManager) return;

    if (editingManager.uid === PRIMARY_SUPER_ADMIN_UID) {
      alert(`The Primary Super Admin UID (${PRIMARY_SUPER_ADMIN_UID}) role cannot be altered.`);
      return;
    }

    try {
      const managerRef = doc(db, 'managerAssignments', editingManager.uid);
      await updateDoc(managerRef, {
        role: editRole,
        permissions: [editRole],
        updatedAt: new Date().toISOString(),
      });

      await updateDoc(doc(db, 'users', editingManager.uid), {
        managerRole: editRole,
        updatedAt: new Date().toISOString(),
      });

      await logManagerActivity({
        managerUid: currentUser?.id || PRIMARY_SUPER_ADMIN_UID,
        managerName: currentUser?.name || 'Primary Super Admin',
        managerEmail: currentUser?.username || 'admin@grobaax.app',
        role: currentUser?.role || 'SUPER_ADMIN',
        action: 'CHANGE_MANAGER_ROLE',
        target: 'managerAssignments',
        targetId: editingManager.uid,
        previousValue: { role: editingManager.role },
        newValue: { role: editRole },
      });

      setEditingManager(null);
    } catch (err) {
      console.error('Error updating manager role:', err);
    }
  };

  const handleToggleManagerStatus = async (manager: ManagerAssignment) => {
    if (manager.uid === PRIMARY_SUPER_ADMIN_UID) {
      alert('The Primary Super Admin account cannot be suspended.');
      return;
    }

    try {
      const newStatus = manager.status === 'active' ? 'suspended' : 'active';
      const managerRef = doc(db, 'managerAssignments', manager.uid);
      await updateDoc(managerRef, {
        status: newStatus,
        updatedAt: new Date().toISOString(),
      });

      await logManagerActivity({
        managerUid: currentUser?.id || PRIMARY_SUPER_ADMIN_UID,
        managerName: currentUser?.name || 'Primary Super Admin',
        managerEmail: currentUser?.username || 'admin@grobaax.app',
        role: currentUser?.role || 'SUPER_ADMIN',
        action: newStatus === 'suspended' ? 'SUSPEND_MANAGER' : 'REACTIVATE_MANAGER',
        target: 'managerAssignments',
        targetId: manager.uid,
        previousValue: { status: manager.status },
        newValue: { status: newStatus },
      });
    } catch (err) {
      console.error('Error toggling manager status:', err);
    }
  };

  const handleRemoveManager = async (manager: ManagerAssignment) => {
    if (manager.uid === PRIMARY_SUPER_ADMIN_UID) {
      alert('The Primary Super Admin account cannot be removed.');
      return;
    }

    if (!window.confirm(`Are you sure you want to revoke administrative permissions for ${manager.name}?`)) {
      return;
    }

    try {
      await deleteDoc(doc(db, 'managerAssignments', manager.uid));

      await updateDoc(doc(db, 'users', manager.uid), {
        role: 'student',
        updatedAt: new Date().toISOString(),
      });

      await logManagerActivity({
        managerUid: currentUser?.id || PRIMARY_SUPER_ADMIN_UID,
        managerName: currentUser?.name || 'Primary Super Admin',
        managerEmail: currentUser?.username || 'admin@grobaax.app',
        role: currentUser?.role || 'SUPER_ADMIN',
        action: 'REVOKE_MANAGER_ROLE',
        target: 'managerAssignments',
        targetId: manager.uid,
        previousValue: manager,
        newValue: null,
      });
    } catch (err) {
      console.error('Error removing manager:', err);
    }
  };

  const filteredUsersForSearch = users.filter((u) => {
    if (!userSearchQuery.trim()) return false;
    const q = userSearchQuery.toLowerCase();
    return (
      u.name.toLowerCase().includes(q) ||
      u.username.toLowerCase().includes(q) ||
      u.id.toLowerCase().includes(q)
    );
  });

  const filteredManagers = managers.filter((m) => {
    const matchesSearch =
      m.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      m.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      m.uid.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesRole = roleFilter === 'ALL' ? true : m.role === roleFilter;

    return matchesSearch && matchesRole;
  });

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="p-6 rounded-2xl bg-gradient-to-r from-blue-950 via-slate-900 to-blue-950 text-white shadow-xl border border-blue-500/20">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2 mb-2">
              <span className="px-3 py-1 rounded-full text-xs font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30 uppercase tracking-wider">
                Primary Super Admin Authority
              </span>
              <span className="px-2.5 py-0.5 rounded-md text-[10px] font-mono bg-blue-950/80 text-blue-200 border border-blue-500/30">
                UID: {PRIMARY_SUPER_ADMIN_UID}
              </span>
            </div>
            <h1 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight flex items-center gap-2">
              <ShieldCheck className="w-8 h-8 text-blue-400" />
              Role-Based Access Control (RBAC) & Managers
            </h1>
            <p className="text-blue-200 text-sm mt-1 max-w-2xl">
              Assign administrative roles, delegate platform responsibilities, manage access permissions, and track real-time manager audit logs.
            </p>
          </div>

          <button
            onClick={() => setIsAddModalOpen(true)}
            className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-sm flex items-center gap-2 shadow-lg hover:shadow-blue-500/30 transition-all duration-200"
          >
            <UserPlus className="w-4 h-4" />
            Add New Manager
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center space-x-2 mt-6 pt-4 border-t border-blue-500/20">
          <button
            onClick={() => setActiveTab('managers')}
            className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
              activeTab === 'managers'
                ? 'bg-blue-600 text-white shadow-md'
                : 'text-blue-300 hover:text-white hover:bg-blue-900/40'
            }`}
          >
            Assigned Managers ({managers.length})
          </button>
          <button
            onClick={() => setActiveTab('logs')}
            className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
              activeTab === 'logs'
                ? 'bg-blue-600 text-white shadow-md'
                : 'text-blue-300 hover:text-white hover:bg-blue-900/40'
            }`}
          >
            Manager Activity Log ({logs.length})
          </button>
          <button
            onClick={() => setActiveTab('roles')}
            className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
              activeTab === 'roles'
                ? 'bg-blue-600 text-white shadow-md'
                : 'text-blue-300 hover:text-white hover:bg-blue-900/40'
            }`}
          >
            Role Permissions Matrix ({ALL_MANAGER_ROLES.length})
          </button>
        </div>
      </div>

      {message && (
        <div
          className={`p-4 rounded-xl flex items-center justify-between ${
            message.type === 'success'
              ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30'
              : 'bg-rose-500/10 text-rose-700 dark:text-rose-300 border border-rose-500/30'
          }`}
        >
          <span className="text-sm font-medium">{message.text}</span>
          <button onClick={() => setMessage(null)} className="text-xs font-semibold hover:underline">
            Dismiss
          </button>
        </div>
      )}

      {/* MANAGERS TAB */}
      {activeTab === 'managers' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
            <div className="relative w-full sm:w-80">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search by manager name, email or UID..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-3 py-2 rounded-lg bg-slate-100 dark:bg-slate-800 border-none text-xs font-medium text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="px-3 py-2 rounded-lg bg-slate-100 dark:bg-slate-800 border-none text-xs font-medium text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-blue-500"
            >
              <option value="ALL">All Administrative Roles</option>
              {ALL_MANAGER_ROLES.map((r) => (
                <option key={r} value={r}>
                  {ROLE_LABELS[r]}
                </option>
              ))}
            </select>
          </div>

          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
            {loading ? (
              <div className="p-12 text-center">
                <RefreshCw className="w-8 h-8 text-blue-600 animate-spin mx-auto mb-3" />
                <p className="text-sm text-slate-500">Loading manager assignments...</p>
              </div>
            ) : filteredManagers.length === 0 ? (
              <div className="p-12 text-center">
                <Shield className="w-10 h-10 text-slate-400 mx-auto mb-2" />
                <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">No managers found</p>
                <p className="text-xs text-slate-500 mt-1">Try clearing filters or search terms.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 dark:bg-slate-800/50 text-slate-500 dark:text-slate-400 uppercase font-semibold">
                    <tr>
                      <th className="p-3.5">Manager Profile</th>
                      <th className="p-3.5">Assigned Role</th>
                      <th className="p-3.5">UID</th>
                      <th className="p-3.5">Assigned By</th>
                      <th className="p-3.5">Status</th>
                      <th className="p-3.5 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-800 dark:text-slate-200">
                    {filteredManagers.map((manager) => {
                      const isSuper = manager.uid === PRIMARY_SUPER_ADMIN_UID;
                      return (
                        <tr key={manager.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition">
                          <td className="p-3.5">
                            <div className="flex items-center space-x-3">
                              <img
                                src={manager.avatar}
                                alt={manager.name}
                                className="w-9 h-9 rounded-full object-cover bg-slate-200 border border-blue-500/20"
                              />
                              <div>
                                <div className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                                  {manager.name}
                                  {isSuper && (
                                    <span className="px-2 py-0.5 rounded text-[9px] font-extrabold bg-amber-500 text-slate-950 uppercase">
                                      PRIMARY SUPER ADMIN
                                    </span>
                                  )}
                                </div>
                                <div className="text-[10px] text-slate-400">{manager.email}</div>
                              </div>
                            </div>
                          </td>

                          <td className="p-3.5">
                            <span className="px-2.5 py-1 rounded-lg text-[10px] font-extrabold uppercase bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
                              {ROLE_LABELS[manager.role] || manager.role}
                            </span>
                          </td>

                          <td className="p-3.5 font-mono text-[10px] text-slate-500 dark:text-slate-400">
                            {manager.uid}
                          </td>

                          <td className="p-3.5">
                            <div className="font-semibold text-slate-800 dark:text-slate-200">{manager.assignedByName}</div>
                            <div className="text-[10px] text-slate-400">
                              {new Date(manager.assignedAt).toLocaleDateString()}
                            </div>
                          </td>

                          <td className="p-3.5">
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                                manager.status === 'active'
                                  ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                                  : 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20'
                              }`}
                            >
                              {manager.status}
                            </span>
                          </td>

                          <td className="p-3.5 text-right space-x-2">
                            {isSuper ? (
                              <span className="text-[10px] text-slate-400 font-semibold italic flex items-center justify-end gap-1">
                                <Lock className="w-3 h-3 text-amber-500" /> Master Override Authority
                              </span>
                            ) : (
                              <>
                                <button
                                  onClick={() => {
                                    setEditingManager(manager);
                                    setEditRole(manager.role);
                                  }}
                                  className="p-1.5 rounded-lg bg-blue-50 dark:bg-blue-950/30 text-blue-600 dark:text-blue-300 hover:bg-blue-100 transition"
                                  title="Change Role"
                                >
                                  <Edit3 className="w-4 h-4" />
                                </button>

                                <button
                                  onClick={() => handleToggleManagerStatus(manager)}
                                  className={`p-1.5 rounded-lg transition ${
                                    manager.status === 'active'
                                      ? 'bg-rose-50 dark:bg-rose-950/30 text-rose-600 hover:bg-rose-100'
                                      : 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 hover:bg-emerald-100'
                                  }`}
                                  title={manager.status === 'active' ? 'Suspend Manager' : 'Reactivate Manager'}
                                >
                                  {manager.status === 'active' ? <XCircle className="w-4 h-4" /> : <CheckCircle2 className="w-4 h-4" />}
                                </button>

                                <button
                                  onClick={() => handleRemoveManager(manager)}
                                  className="p-1.5 rounded-lg bg-rose-50 dark:bg-rose-950/30 text-rose-600 dark:text-rose-400 hover:bg-rose-100 transition"
                                  title="Revoke Manager Role"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ACTIVITY LOGS TAB */}
      {activeTab === 'logs' && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
          <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
            <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Clock className="w-5 h-5 text-blue-500" />
              Manager Activity Stream & Audit Logs ({logs.length})
            </h3>
            <span className="text-xs text-slate-500">Records all administrative system actions</span>
          </div>

          {logs.length === 0 ? (
            <div className="p-12 text-center">
              <Clock className="w-10 h-10 text-slate-400 mx-auto mb-2" />
              <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">No activity logs recorded yet</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 dark:bg-slate-800/50 text-slate-500 dark:text-slate-400 uppercase font-semibold">
                  <tr>
                    <th className="p-3.5">Manager</th>
                    <th className="p-3.5">Action</th>
                    <th className="p-3.5">Target</th>
                    <th className="p-3.5">Date & Time</th>
                    <th className="p-3.5">Details</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-800 dark:text-slate-200">
                  {logs.map((log) => (
                    <tr key={log.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition">
                      <td className="p-3.5 font-medium">
                        <div>
                          <div className="font-bold text-slate-900 dark:text-white">{log.managerName}</div>
                          <div className="text-[10px] text-slate-400 font-mono">{log.managerEmail || log.managerUid}</div>
                        </div>
                      </td>

                      <td className="p-3.5 font-bold text-blue-600 dark:text-blue-400">
                        {log.action}
                      </td>

                      <td className="p-3.5">
                        <span className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-mono text-[10px]">
                          {log.target} ({log.targetId})
                        </span>
                      </td>

                      <td className="p-3.5 text-slate-500">
                        {log.date} {log.time}
                      </td>

                      <td className="p-3.5 max-w-xs truncate text-[10px] font-mono text-slate-400">
                        {log.newValue ? JSON.stringify(log.newValue) : 'N/A'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ROLES MATRIX TAB */}
      {activeTab === 'roles' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {ALL_MANAGER_ROLES.map((role) => (
            <div
              key={role}
              className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm hover:border-blue-500/40 transition-all"
            >
              <div className="flex items-center justify-between mb-3">
                <span className="px-2.5 py-1 rounded-md text-[10px] font-extrabold uppercase bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
                  {ROLE_LABELS[role]}
                </span>
                <Shield className="w-5 h-5 text-blue-500" />
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-300 min-h-[48px]">
                {ROLE_DESCRIPTIONS[role]}
              </p>
              <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[11px] text-slate-400">
                <span>Key: {role}</span>
                <span className="font-semibold text-blue-500">Active Access</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ADD MANAGER MODAL */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-lg w-full border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden">
            <div className="p-6 bg-blue-950 text-white flex items-center justify-between">
              <div>
                <h3 className="text-xl font-bold">Assign Administrative Manager</h3>
                <p className="text-xs text-blue-200 mt-0.5">
                  Search existing registered Grobaax users and grant role permissions.
                </p>
              </div>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="p-1.5 rounded-lg bg-blue-900 hover:bg-blue-800 text-white transition"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleAddManager} className="p-6 space-y-4">
              {/* User Search Input */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  1. Search Registered Grobaax User *
                </label>
                <div className="relative">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={userSearchQuery}
                    onChange={(e) => {
                      setUserSearchQuery(e.target.value);
                      setSelectedUserForManager(null);
                    }}
                    placeholder="Search user by Name, Username or UID..."
                    className="w-full pl-9 pr-3 py-2 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                {/* Dropdown Results */}
                {userSearchQuery && !selectedUserForManager && (
                  <div className="mt-2 max-h-40 overflow-y-auto rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 divide-y divide-slate-100 dark:divide-slate-700">
                    {filteredUsersForSearch.length === 0 ? (
                      <div className="p-3 text-xs text-slate-500">No users found matching query.</div>
                    ) : (
                      filteredUsersForSearch.map((user) => (
                        <div
                          key={user.id}
                          onClick={() => {
                            setSelectedUserForManager(user);
                            setUserSearchQuery(user.name);
                          }}
                          className="p-2.5 flex items-center space-x-3 hover:bg-blue-500/10 cursor-pointer transition"
                        >
                          <img src={user.avatar} className="w-7 h-7 rounded-full bg-slate-200" />
                          <div>
                            <div className="text-xs font-bold text-slate-900 dark:text-white">{user.name}</div>
                            <div className="text-[10px] text-slate-400">@{user.username} • UID: {user.id}</div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>

              {/* Selected User Display */}
              {selectedUserForManager && (
                <div className="p-3 rounded-xl bg-blue-500/10 border border-blue-500/30 flex items-center space-x-3">
                  <img src={selectedUserForManager.avatar} className="w-10 h-10 rounded-full bg-slate-200" />
                  <div>
                    <div className="text-xs font-bold text-slate-900 dark:text-white">{selectedUserForManager.name}</div>
                    <div className="text-[10px] text-blue-600 dark:text-blue-300 font-mono">
                      UID: {selectedUserForManager.id} • {selectedUserForManager.institution}
                    </div>
                  </div>
                </div>
              )}

              {/* Role Selection */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  2. Select Manager Role *
                </label>
                <select
                  value={assignedRole}
                  onChange={(e) => setAssignedRole(e.target.value as ManagerRole)}
                  className="w-full px-3 py-2.5 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-medium text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                >
                  {ALL_MANAGER_ROLES.filter((r) => r !== 'SUPER_ADMIN').map((r) => (
                    <option key={r} value={r}>
                      {ROLE_LABELS[r]}
                    </option>
                  ))}
                </select>
                <p className="text-[11px] text-slate-400 mt-1">
                  {ROLE_DESCRIPTIONS[assignedRole]}
                </p>
              </div>

              <div className="pt-4 border-t border-slate-200 dark:border-slate-800 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 rounded-lg border border-slate-300 text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving || !selectedUserForManager}
                  className="px-5 py-2 rounded-lg bg-blue-600 hover:bg-blue-800 text-white text-xs font-bold transition flex items-center gap-1.5 shadow-md disabled:opacity-60"
                >
                  {isSaving ? <RefreshCw className="w-4 h-4 animate-spin" /> : 'Assign Manager Permissions'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT ROLE MODAL */}
      {editingManager && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-md w-full border border-slate-200 dark:border-slate-800 shadow-2xl p-6 space-y-4">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">
              Change Manager Role for {editingManager.name}
            </h3>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Select New Administrative Role
              </label>
              <select
                value={editRole}
                onChange={(e) => setEditRole(e.target.value as ManagerRole)}
                className="w-full px-3 py-2 rounded-lg bg-slate-100 dark:bg-slate-800 border text-xs text-slate-900 dark:text-white"
              >
                {ALL_MANAGER_ROLES.filter((r) => r !== 'SUPER_ADMIN').map((r) => (
                  <option key={r} value={r}>
                    {ROLE_LABELS[r]}
                  </option>
                ))}
              </select>
            </div>

            <div className="pt-2 flex justify-end space-x-2">
              <button
                onClick={() => setEditingManager(null)}
                className="px-4 py-2 rounded-lg border text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                onClick={handleUpdateManagerRole}
                className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-800 text-white text-xs font-bold"
              >
                Save Role
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
