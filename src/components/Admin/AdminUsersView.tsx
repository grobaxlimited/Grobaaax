import React, { useState, useEffect } from 'react';
import { UserProfile, UserRole, PRIMARY_SUPER_ADMIN_UID } from '../../types';
import {
  db,
  approveStudentVerificationRequest,
  rejectStudentVerificationRequest,
  adjustUserGpInFirestore,
  deleteUserFromFirestore,
  isEmailAvailable,
  collection,
  getDocs,
  doc,
  setDoc,
  updateDoc,
  increment,
  addDoc,
  serverTimestamp,
  query,
  limit,
} from '../../lib/firebase';
import { logManagerActivity, isPrimarySuperAdmin } from '../../lib/adminPermissions';
import { useApp } from '../../context/AppContext';
import {
  Users,
  Search,
  Filter,
  Shield,
  ShieldAlert,
  Wallet,
  CheckCircle2,
  XCircle,
  Eye,
  Edit3,
  Award,
  Building,
  GraduationCap,
  RefreshCw,
  PlusCircle,
  MinusCircle,
  ArrowUpRight,
  Mail,
  Globe,
  Sparkles,
  Clock,
  Calendar,
  Trash2,
  AlertTriangle,
} from 'lucide-react';

export function AdminUsersView() {
  const { userProfile: currentUser, setCurrentUser } = useApp();
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [authFilter, setAuthFilter] = useState<string>('ALL');
  const [institutionFilter, setInstitutionFilter] = useState<string>('ALL');
  const [verificationFilter, setVerificationFilter] = useState<string>('ALL');
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Selected User Modal
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isGpModalOpen, setIsGpModalOpen] = useState(false);
  const [gpAmount, setGpAmount] = useState<number>(500);
  const [gpAction, setGpAction] = useState<'add' | 'subtract'>('add');
  const [gpReason, setGpReason] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  // User Deletion State
  const [userToDelete, setUserToDelete] = useState<UserProfile | null>(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isDeletingUser, setIsDeletingUser] = useState(false);
  const [deleteConfirmationInput, setDeleteConfirmationInput] = useState('');
  const [deleteErrorMsg, setDeleteErrorMsg] = useState('');

  // New Scholar Creation Modal
  const [isCreateUserModalOpen, setIsCreateUserModalOpen] = useState(false);
  const [newEmail, setNewEmail] = useState('');
  const [newName, setNewName] = useState('');
  const [newUsername, setNewUsername] = useState('');
  const [newInstitution, setNewInstitution] = useState('University of Lagos (UNILAG)');
  const [newDepartment, setNewDepartment] = useState('Computer Science');
  const [newLevel, setNewLevel] = useState('100 Level');
  const [newStartingGp, setNewStartingGp] = useState('0');
  const [newRole, setNewRole] = useState<'student' | 'representative' | 'admin'>('student');
  const [isCreatingUser, setIsCreatingUser] = useState(false);
  const [createSuccessMsg, setCreateSuccessMsg] = useState('');

  // Fetch users on demand from Firestore with limit(50) to optimize quota
  const fetchUsersData = async () => {
    try {
      setLoading(true);
      const q = query(collection(db, 'users'), limit(50));
      const snapshot = await getDocs(q);
      const loadedUsers: UserProfile[] = [];
      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        const userEmail = data.email || '';

        // Detect auth provider
        let detectedProvider = data.authProvider || '';
        if (!detectedProvider) {
          if (data.photoURL || (data.avatar && data.avatar.includes('googleusercontent'))) {
            detectedProvider = 'google.com';
          } else if (userEmail) {
            detectedProvider = 'email_password';
          } else {
            detectedProvider = 'email_password';
          }
        }

        // Parse creation timestamp
        let createdDateStr = '';
        if (data.createdAt) {
          if (typeof data.createdAt.toDate === 'function') {
            createdDateStr = data.createdAt.toDate().toISOString();
          } else if (typeof data.createdAt === 'string') {
            createdDateStr = data.createdAt;
          }
        }

        const isSuper =
          isPrimarySuperAdmin(docSnap.id, userEmail) ||
          userEmail === 'grobaxycompany@gmail.com' ||
          docSnap.id === PRIMARY_SUPER_ADMIN_UID ||
          data.role === 'admin' ||
          data.role === 'super_admin';
        const isMockName = (data.fullName === 'Alex Chen' || data.name === 'Alex Chen') && userEmail !== 'alex@mit.edu' && docSnap.id !== 'user_student';
        const resolvedName = (!isMockName && (data.fullName || data.name || data.displayName)) || (userEmail ? userEmail.split('@')[0] : 'Grobaax Scholar');
        const resolvedRole = isSuper ? 'admin' : (data.role || 'student');

        loadedUsers.push({
          id: docSnap.id,
          name: resolvedName,
          username: data.username || userEmail.split('@')[0] || docSnap.id.substring(0, 8),
          email: userEmail,
          avatar: data.profileImage || data.avatar || data.photoURL || `https://api.dicebear.com/7.x/bottts/svg?seed=${docSnap.id}`,
          profileImage: data.profileImage || data.avatar || data.photoURL || `https://api.dicebear.com/7.x/bottts/svg?seed=${docSnap.id}`,
          role: resolvedRole,
          authProvider: detectedProvider,
          createdAt: createdDateStr || data.joinedDate || '',
          isRepresentative: Boolean(data.isRepresentative),
          institution: data.institutionName || data.institution || (isSuper ? 'Grobaax Systems Administration' : 'Unassigned Institution'),
          institutionCategory: data.institutionCategory || 'University',
          department: data.departmentName || data.department || (isSuper ? 'HQ Overseer' : 'General Studies'),
          level: data.level || (isSuper ? 'Executive Level' : '100 Level'),
          major: data.major || data.departmentName || data.department || (isSuper ? 'Executive Administrator' : 'Undergraduate'),
          grbxTokens: data.grbxTokens || 0,
          gpBalance: typeof data.gpBalance === 'number' ? data.gpBalance : (data.gpBalance ? Number(data.gpBalance) : (isSuper ? 100000 : 0)),
          stakedTokens: data.stakedTokens || 0,
          reputationPoints: data.reputationPoints || 100,
          gusRank: data.gusRank || 0,
          gusTier: data.gusTier || (isSuper ? 'Grandmaster' : 'Scholar'),
          walletAddress: data.walletAddress || `0x${docSnap.id.substring(0, 10)}`,
          bio: data.bio || (isSuper ? 'Primary Super Administrator of Grobaax Box.' : ''),
          verified: Boolean(data.verified || isSuper),
          studentIdCardUrl: data.studentIdCardUrl || '',
          idVerificationStatus: isSuper ? 'verified' : (data.idVerificationStatus || (data.verified ? 'verified' : (data.studentIdCardUrl ? 'pending' : 'unsubmitted'))),
          idCardUploadedAt: data.idCardUploadedAt || '',
          isPostingSuspended: Boolean(data.isPostingSuspended || data.accountStatus === 'suspended'),
          activePlanId: isSuper ? 'plan_titan_naira' : (data.activePlanId || ''),
          membershipTier: isSuper ? 'Grobaax Titan Annual VIP' : (data.membershipTier || data.subscriptionTier || 'Free Scholar'),
          subscriptionTier: isSuper ? 'Grobaax Titan Annual VIP' : (data.subscriptionTier || data.membershipTier || 'Free Scholar'),
          subscriptionPlan: isSuper ? 'Grobaax Titan Annual VIP' : (data.subscriptionPlan || data.membershipTier || ''),
          planId: isSuper ? 'plan_titan_naira' : (data.planId || data.activePlanId || ''),
          tier: isSuper ? 'Grobaax Titan Annual VIP' : (data.tier || data.membershipTier || 'Free Scholar'),
          isSubscribed: isSuper || Boolean(data.isSubscribed || data.isPremium || (data.activePlanId && !data.activePlanId.toLowerCase().includes('free'))),
          isPremium: isSuper || Boolean(data.isPremium || (data.activePlanId && !data.activePlanId.toLowerCase().includes('free'))),
          isVip: isSuper || Boolean(data.isVip || (data.membershipTier && data.membershipTier.toLowerCase().includes('vip'))),
          subscriptionExpiry: isSuper ? '2099-12-31T23:59:59.999Z' : (data.subscriptionExpiry || ''),
          privacy: data.privacy || {
            showInstitution: true,
            showDepartment: true,
            showLevel: true,
            institutionVisibility: 'Public',
            departmentVisibility: 'Public',
            levelVisibility: 'Public',
            showAcademicInfoOnPosts: true,
          },
          badges: data.badges || [],
          purchasedBadgeIds: data.purchasedBadgeIds || [],
        });
      });

      // Sort users by newest registration first
      loadedUsers.sort((a, b) => {
        const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return timeB - timeA;
      });

      setUsers(loadedUsers);
    } catch (err: any) {
      console.warn('Notice fetching users in AdminUsersView (fallback active):', err?.message || err);
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchUsersData();
  }, []);

  const handleManualRefresh = () => {
    setIsRefreshing(true);
    fetchUsersData();
  };

  // Filtered User list
  const filteredUsers = users.filter((u) => {
    const term = searchTerm.toLowerCase();
    const matchesSearch =
      u.name.toLowerCase().includes(term) ||
      u.username.toLowerCase().includes(term) ||
      (u.email || '').toLowerCase().includes(term) ||
      u.id.toLowerCase().includes(term) ||
      u.institution.toLowerCase().includes(term) ||
      u.department.toLowerCase().includes(term) ||
      u.level.toLowerCase().includes(term);

    const matchesRole =
      roleFilter === 'ALL'
        ? true
        : roleFilter === 'REPRESENTATIVE'
        ? u.isRepresentative
        : u.role === roleFilter.toLowerCase();

    const matchesStatus =
      statusFilter === 'ALL'
        ? true
        : statusFilter === 'ACTIVE'
        ? !u.isPostingSuspended
        : u.isPostingSuspended;

    const matchesAuth =
      authFilter === 'ALL'
        ? true
        : authFilter === 'EMAIL_PASSWORD'
        ? (u.authProvider === 'email_password' || (!u.authProvider?.includes('google') && !u.authProvider?.includes('admin')))
        : authFilter === 'GOOGLE'
        ? u.authProvider?.includes('google')
        : authFilter === 'ADMIN'
        ? u.authProvider?.includes('admin')
        : true;

    const matchesInstitution =
      institutionFilter === 'ALL' ? true : u.institution === institutionFilter;

    const matchesVerification =
      verificationFilter === 'ALL'
        ? true
        : verificationFilter === 'PENDING'
        ? (u.idVerificationStatus === 'pending' || (Boolean(u.studentIdCardUrl) && !u.verified && u.idVerificationStatus !== 'rejected'))
        : verificationFilter === 'VERIFIED'
        ? (u.verified || u.idVerificationStatus === 'verified')
        : verificationFilter === 'REJECTED'
        ? u.idVerificationStatus === 'rejected'
        : verificationFilter === 'NO_CARD'
        ? !u.studentIdCardUrl
        : true;

    return matchesSearch && matchesRole && matchesStatus && matchesAuth && matchesInstitution && matchesVerification;
  });

  // Extract unique institutions for dropdown
  const uniqueInstitutions = Array.from(new Set(users.map((u) => u.institution))).filter(Boolean);

  const handleToggleUserSuspension = async (targetUser: UserProfile) => {
    try {
      const userRef = doc(db, 'users', targetUser.id);
      const newSuspendedState = !targetUser.isPostingSuspended;

      await updateDoc(userRef, {
        isPostingSuspended: newSuspendedState,
        accountStatus: newSuspendedState ? 'suspended' : 'active',
        updatedAt: new Date().toISOString(),
      });

      await logManagerActivity({
        managerUid: currentUser?.id || PRIMARY_SUPER_ADMIN_UID,
        managerName: currentUser?.name || 'Super Admin',
        managerEmail: currentUser?.username || 'admin@grobaax.app',
        role: currentUser?.role || 'SUPER_ADMIN',
        action: newSuspendedState ? 'SUSPEND_USER_ACCOUNT' : 'REACTIVATE_USER_ACCOUNT',
        target: 'users',
        targetId: targetUser.id,
        previousValue: { isPostingSuspended: targetUser.isPostingSuspended },
        newValue: { isPostingSuspended: newSuspendedState },
      });
    } catch (err) {
      console.error('Error toggling user suspension:', err);
    }
  };

  const handleApproveVerification = async (targetUser: UserProfile) => {
    try {
      const reviewerUid = currentUser?.id || PRIMARY_SUPER_ADMIN_UID;
      const reviewerName = currentUser?.name || 'Super Admin';

      await approveStudentVerificationRequest(targetUser.id, reviewerUid, reviewerName);

      await logManagerActivity({
        managerUid: reviewerUid,
        managerName: reviewerName,
        managerEmail: currentUser?.username || 'admin@grobaax.app',
        role: currentUser?.role || 'SUPER_ADMIN',
        action: 'APPROVE_STUDENT_ID_VERIFICATION',
        target: 'users',
        targetId: targetUser.id,
        previousValue: { verified: targetUser.verified, idVerificationStatus: targetUser.idVerificationStatus },
        newValue: { verified: true, idVerificationStatus: 'verified' },
      });

      setSelectedUser((prev) => (prev ? { ...prev, verified: true, idVerificationStatus: 'verified' } : null));
    } catch (err) {
      console.error('Error approving verification:', err);
    }
  };

  const handleRejectVerification = async (targetUser: UserProfile) => {
    try {
      const reviewerUid = currentUser?.id || PRIMARY_SUPER_ADMIN_UID;
      const reviewerName = currentUser?.name || 'Super Admin';

      await rejectStudentVerificationRequest(
        targetUser.id,
        reviewerUid,
        reviewerName,
        'Student ID credentials could not be verified with university records.'
      );

      await logManagerActivity({
        managerUid: reviewerUid,
        managerName: reviewerName,
        managerEmail: currentUser?.username || 'admin@grobaax.app',
        role: currentUser?.role || 'SUPER_ADMIN',
        action: 'REJECT_STUDENT_ID_VERIFICATION',
        target: 'users',
        targetId: targetUser.id,
        previousValue: { verified: targetUser.verified, idVerificationStatus: targetUser.idVerificationStatus },
        newValue: { verified: false, idVerificationStatus: 'rejected' },
      });

      setSelectedUser((prev) => (prev ? { ...prev, verified: false, idVerificationStatus: 'rejected' } : null));
    } catch (err) {
      console.error('Error rejecting verification:', err);
    }
  };

  const handleAdjustGpBalance = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser || gpAmount <= 0) return;

    setIsProcessing(true);
    try {
      const delta = gpAction === 'add' ? gpAmount : -gpAmount;
      const adminUid = currentUser?.id || PRIMARY_SUPER_ADMIN_UID;
      const adminName = currentUser?.name || 'Super Admin';
      const adminEmail = currentUser?.email || currentUser?.username || 'admin@grobaax.app';

      const result = await adjustUserGpInFirestore(
        selectedUser.id,
        delta,
        gpReason || 'Authorized Admin Wallet Adjustment',
        adminUid
      );

      if (result.success) {
        // Optimistically update local users list
        setUsers((prev) =>
          prev.map((u) => (u.id === selectedUser.id ? { ...u, gpBalance: result.newBalance } : u))
        );

        // If the targeted user is the logged in user, also update global currentUser
        if (currentUser && (currentUser.id === selectedUser.id || (currentUser as any).uid === selectedUser.id)) {
          setCurrentUser((prev) => ({ ...prev, gpBalance: result.newBalance }));
        }

        await logManagerActivity({
          managerUid: adminUid,
          managerName: adminName,
          managerEmail: adminEmail,
          role: currentUser?.role || 'SUPER_ADMIN',
          action: 'ADJUST_USER_GP_BALANCE',
          target: 'users',
          targetId: selectedUser.id,
          previousValue: { gpBalance: selectedUser.gpBalance },
          newValue: { gpBalance: result.newBalance, adjustment: delta, reason: gpReason },
        }).catch((logErr) => console.warn('Manager log warning:', logErr));

        setIsGpModalOpen(false);
        setSelectedUser(null);
        setGpAmount(100);
        setGpReason('');
      } else {
        alert(result.error || 'Failed to adjust GP balance');
      }
    } catch (err) {
      console.error('Error adjusting GP balance:', err);
      alert('An error occurred while updating the GP balance.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleOpenDeleteModal = (targetUser: UserProfile) => {
    setUserToDelete(targetUser);
    setDeleteConfirmationInput('');
    setDeleteErrorMsg('');
    setIsDeleteModalOpen(true);
  };

  const handleConfirmDeleteUser = async () => {
    if (!userToDelete) return;
    setIsDeletingUser(true);
    setDeleteErrorMsg('');

    try {
      const adminUid = currentUser?.id || PRIMARY_SUPER_ADMIN_UID;
      const adminName = currentUser?.name || 'Super Admin';

      const result = await deleteUserFromFirestore(userToDelete.id, adminUid, adminName);
      if (!result.success) {
        setDeleteErrorMsg(result.error || 'Failed to delete user');
        setIsDeletingUser(false);
        return;
      }

      // Log manager activity
      await logManagerActivity({
        managerUid: adminUid,
        managerName: adminName,
        managerEmail: currentUser?.username || currentUser?.email || 'admin@grobaax.app',
        role: currentUser?.role || 'SUPER_ADMIN',
        action: 'DELETE_USER_RECORD',
        target: 'users',
        targetId: userToDelete.id,
        previousValue: {
          name: userToDelete.name,
          email: userToDelete.email,
          username: userToDelete.username,
          gpBalance: userToDelete.gpBalance,
        },
        newValue: { deleted: true },
      }).catch((e) => console.warn('Manager log warning:', e));

      // Optimistically update local users list
      setUsers((prev) => prev.filter((u) => u.id !== userToDelete.id));

      if (selectedUser && selectedUser.id === userToDelete.id) {
        setIsDetailModalOpen(false);
        setSelectedUser(null);
      }

      setIsDeleteModalOpen(false);
      setUserToDelete(null);
      setDeleteConfirmationInput('');
    } catch (err: any) {
      console.error('Error in handleConfirmDeleteUser:', err);
      setDeleteErrorMsg(err?.message || 'Failed to delete user account.');
    } finally {
      setIsDeletingUser(false);
    }
  };

  const handleCreateUserInFirestore = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEmail || !newName) return;
    setIsCreatingUser(true);
    setCreateSuccessMsg('');

    try {
      // Validate no duplicate email accounts
      const emailAvailable = await isEmailAvailable(newEmail.trim());
      if (!emailAvailable) {
        alert('An account with this email address already exists in the Firestore database. Duplicate email accounts are not permitted.');
        setIsCreatingUser(false);
        return;
      }

      // Create user doc with synthetic or custom UID based on sanitized email
      const customUid = 'usr_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7);
      const userDocRef = doc(db, 'users', customUid);
      const startingGpNum = Number(newStartingGp) || 0;
      const computedUsername = newUsername.trim() || newEmail.split('@')[0] || `scholar_${Date.now().toString().slice(-4)}`;

      const newUserData = {
        id: customUid,
        uid: customUid,
        email: newEmail.trim().toLowerCase(),
        name: newName.trim(),
        fullName: newName.trim(),
        username: computedUsername,
        usernameLower: computedUsername.toLowerCase(),
        avatar: `https://api.dicebear.com/7.x/bottts/svg?seed=${customUid}`,
        profileImage: `https://api.dicebear.com/7.x/bottts/svg?seed=${customUid}`,
        role: newRole,
        institution: newInstitution,
        institutionName: newInstitution,
        department: newDepartment,
        departmentName: newDepartment,
        level: newLevel,
        major: newDepartment,
        academicProfileCompleted: true,
        gpBalance: startingGpNum,
        grbxTokens: 0,
        stakedTokens: 0,
        reputationPoints: 100,
        gusRank: 0,
        gusTier: 'Scholar',
        walletAddress: `0x${customUid.substring(0, 10)}`,
        bio: 'Verified Grobaax Scholar Profile',
        verified: true,
        idVerificationStatus: 'verified',
        accountStatus: 'active',
        isPostingSuspended: false,
        authProvider: 'email_admin_provisioned',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      await setDoc(userDocRef, newUserData);

      setCreateSuccessMsg(`User profile for ${newName} (${newEmail}) provisioned in Firestore database!`);
      setNewEmail('');
      setNewName('');
      setNewUsername('');
      setNewStartingGp('0');
      setTimeout(() => {
        setCreateSuccessMsg('');
        setIsCreateUserModalOpen(false);
      }, 3000);
    } catch (err: any) {
      console.error('Error creating user profile in Firestore:', err);
      alert(`Error provisioning user: ${err?.message || err}`);
    } finally {
      setIsCreatingUser(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="p-6 rounded-2xl bg-gradient-to-r from-blue-950 via-blue-900 to-slate-900 text-white shadow-xl border border-blue-500/20">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="px-3 py-1 rounded-full text-xs font-semibold bg-blue-500/30 text-blue-200 border border-blue-400/30 uppercase tracking-wider inline-flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                Live Firestore Synchronization
              </span>
            </div>
            <h1 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight flex items-center gap-2">
              <Users className="w-8 h-8 text-blue-400" />
              Registered User Directory
            </h1>
            <p className="text-blue-200 text-sm mt-1">
              All accounts registered through Email & Password, Google SSO, or Admin provisioning appear here in real-time.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={handleManualRefresh}
              className="px-3.5 py-2.5 bg-blue-900/60 hover:bg-blue-800/80 text-blue-200 hover:text-white font-semibold text-xs rounded-xl border border-blue-500/30 flex items-center gap-2 cursor-pointer transition shadow-sm"
              title="Refresh Real-time Directory"
            >
              <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin text-blue-400' : ''}`} />
              <span>{isRefreshing ? 'Syncing...' : 'Refresh List'}</span>
            </button>

            <button
              onClick={() => setIsCreateUserModalOpen(true)}
              className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow-lg shadow-emerald-600/30 flex items-center gap-2 cursor-pointer transition"
            >
              <PlusCircle className="w-4 h-4" />
              <span>Provision User / Account</span>
            </button>
          </div>
        </div>

        {/* Quick Metrics Bar */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mt-6 pt-6 border-t border-blue-800/50">
          <div className="bg-blue-950/70 p-3.5 rounded-xl border border-blue-500/20">
            <div className="text-xl font-extrabold text-white">
              {users.length.toLocaleString()}
            </div>
            <div className="text-[10px] text-blue-200 uppercase font-bold tracking-wider mt-0.5 flex items-center gap-1">
              <Users className="w-3 h-3 text-blue-400" /> Total Users
            </div>
          </div>

          <div className="bg-blue-950/70 p-3.5 rounded-xl border border-blue-500/20">
            <div className="text-xl font-extrabold text-emerald-400">
              {users.filter(u => u.authProvider === 'email_password' || (!u.authProvider?.includes('google') && !u.authProvider?.includes('admin'))).length.toLocaleString()}
            </div>
            <div className="text-[10px] text-emerald-300 uppercase font-bold tracking-wider mt-0.5 flex items-center gap-1">
              <Mail className="w-3 h-3 text-emerald-400" /> Email & Password
            </div>
          </div>

          <div className="bg-blue-950/70 p-3.5 rounded-xl border border-blue-500/20">
            <div className="text-xl font-extrabold text-sky-400">
              {users.filter(u => u.authProvider?.includes('google')).length.toLocaleString()}
            </div>
            <div className="text-[10px] text-sky-300 uppercase font-bold tracking-wider mt-0.5 flex items-center gap-1">
              <Globe className="w-3 h-3 text-sky-400" /> Google SSO
            </div>
          </div>

          <div className="bg-blue-950/70 p-3.5 rounded-xl border border-blue-500/20">
            <div className="text-xl font-extrabold text-amber-400">
              {users.filter(u => u.idVerificationStatus === 'pending' || (Boolean(u.studentIdCardUrl) && !u.verified && u.idVerificationStatus !== 'rejected')).length.toLocaleString()}
            </div>
            <div className="text-[10px] text-amber-300 uppercase font-bold tracking-wider mt-0.5 flex items-center gap-1">
              <Shield className="w-3 h-3 text-amber-400" /> Pending ID Review
            </div>
          </div>

          <div className="bg-blue-950/70 p-3.5 rounded-xl border border-blue-500/20">
            <div className="text-xl font-extrabold text-amber-400">
              {users.reduce((acc, u) => acc + (u.gpBalance || 0), 0).toLocaleString()} GP
            </div>
            <div className="text-[10px] text-amber-300 uppercase font-bold tracking-wider mt-0.5 flex items-center gap-1">
              <Wallet className="w-3 h-3 text-amber-400" /> Total GP In Circulation
            </div>
          </div>
        </div>
      </div>

      {/* Filter & Controls Bar */}
      <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3">
          {/* Search Box */}
          <div className="relative lg:col-span-2">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search Name, Email, UID, Department, Level..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-2 rounded-lg bg-slate-100 dark:bg-slate-800 border-none text-xs font-medium text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Auth Method Filter */}
          <select
            value={authFilter}
            onChange={(e) => setAuthFilter(e.target.value)}
            className="px-3 py-2 rounded-lg bg-slate-100 dark:bg-slate-800 border-none text-xs font-medium text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-blue-500"
          >
            <option value="ALL">All Auth Methods</option>
            <option value="EMAIL_PASSWORD">📧 Email & Password</option>
            <option value="GOOGLE">🌐 Google SSO</option>
            <option value="ADMIN">🛠️ Admin Provisioned</option>
          </select>

          {/* Role Filter */}
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="px-3 py-2 rounded-lg bg-slate-100 dark:bg-slate-800 border-none text-xs font-medium text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-blue-500"
          >
            <option value="ALL">All Roles</option>
            <option value="STUDENT">Student</option>
            <option value="REPRESENTATIVE">Institution Representative</option>
            <option value="ADMIN">System Admin</option>
          </select>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 rounded-lg bg-slate-100 dark:bg-slate-800 border-none text-xs font-medium text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-blue-500"
          >
            <option value="ALL">All Account Statuses</option>
            <option value="ACTIVE">Active Users</option>
            <option value="SUSPENDED">Suspended Users</option>
          </select>

          {/* Verification Status Filter */}
          <select
            value={verificationFilter}
            onChange={(e) => setVerificationFilter(e.target.value)}
            className="px-3 py-2 rounded-lg bg-slate-100 dark:bg-slate-800 border-none text-xs font-medium text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-blue-500"
          >
            <option value="ALL">All Verifications</option>
            <option value="PENDING">⏳ Pending ID Review ({users.filter(u => u.idVerificationStatus === 'pending' || (Boolean(u.studentIdCardUrl) && !u.verified && u.idVerificationStatus !== 'rejected')).length})</option>
            <option value="VERIFIED">✓ Verified Students</option>
            <option value="REJECTED">✕ Rejected ID</option>
            <option value="NO_CARD">Unsubmitted ID</option>
          </select>
        </div>
      </div>

      {/* Users Data Table */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
            User Accounts List ({filteredUsers.length} of {users.length})
          </h3>
          <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/50 px-2.5 py-1 rounded-md border border-emerald-200 dark:border-emerald-900 flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
            Real-time Firebase Sync Active
          </span>
        </div>

        {loading ? (
          <div className="p-12 text-center">
            <RefreshCw className="w-8 h-8 text-blue-600 animate-spin mx-auto mb-3" />
            <p className="text-sm text-slate-500">Loading user accounts from Firebase...</p>
          </div>
        ) : filteredUsers.length === 0 ? (
          <div className="p-12 text-center">
            <Users className="w-10 h-10 text-slate-400 mx-auto mb-2" />
            <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">No matching user profiles found</p>
            <p className="text-xs text-slate-500 mt-1">Try adjusting your search criteria or active filters.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-800/50 text-slate-500 dark:text-slate-400 uppercase font-semibold">
                <tr>
                  <th className="p-3.5">User Profile</th>
                  <th className="p-3.5">Registration Method</th>
                  <th className="p-3.5">UID</th>
                  <th className="p-3.5">Role</th>
                  <th className="p-3.5">Institution & Dept</th>
                  <th className="p-3.5">ID Verification</th>
                  <th className="p-3.5 text-amber-500 font-extrabold">GP WALLET BALANCE</th>
                  <th className="p-3.5">Status</th>
                  <th className="p-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-800 dark:text-slate-200">
                {filteredUsers.map((user) => (
                  <tr key={user.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition">
                    <td className="p-3.5">
                      <div className="flex items-center space-x-3">
                        <img
                          src={user.avatar}
                          alt={user.name}
                          className="w-9 h-9 rounded-full object-cover bg-slate-200 border border-blue-500/20"
                        />
                        <div>
                          <div className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                            {user.name}
                            {user.verified && <CheckCircle2 className="w-3.5 h-3.5 text-blue-500" />}
                          </div>
                          <div className="text-[10px] text-slate-400 font-mono">@{user.username}</div>
                          {user.email && (
                            <div className="text-[10px] text-blue-600 dark:text-blue-400 font-medium truncate max-w-[180px]">
                              {user.email}
                            </div>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* Registration Method & Date */}
                    <td className="p-3.5">
                      <div className="flex flex-col gap-1">
                        {user.authProvider?.includes('google') ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-sky-500/10 text-sky-600 dark:text-sky-400 border border-sky-500/20 w-fit">
                            <Globe className="w-3 h-3 text-sky-500" /> Google SSO
                          </span>
                        ) : user.authProvider?.includes('admin') ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20 w-fit">
                            <Shield className="w-3 h-3 text-purple-500" /> Admin Provisioned
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 w-fit">
                            <Mail className="w-3 h-3 text-emerald-500" /> Email & Password
                          </span>
                        )}

                        {user.createdAt && (
                          <span className="text-[10px] text-slate-400 flex items-center gap-1">
                            <Calendar className="w-2.5 h-2.5" />
                            {new Date(user.createdAt).toLocaleDateString('en-GB', {
                              day: 'numeric',
                              month: 'short',
                              year: 'numeric',
                            })}
                          </span>
                        )}
                      </div>
                    </td>

                    <td className="p-3.5 font-mono text-[10px] text-slate-500 dark:text-slate-400">
                      {user.id}
                    </td>

                    <td className="p-3.5">
                      <div className="flex flex-col gap-1">
                        <span
                          className={`inline-block px-2 py-0.5 rounded-md text-[10px] font-bold uppercase ${
                            user.role === 'admin'
                              ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20'
                              : 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20'
                          }`}
                        >
                          {user.role}
                        </span>
                        {user.isRepresentative && (
                          <span className="inline-block px-2 py-0.5 rounded-md text-[10px] font-bold uppercase bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                            REP
                          </span>
                        )}
                      </div>
                    </td>

                    <td className="p-3.5">
                      <div className="font-semibold text-slate-800 dark:text-slate-200">{user.institution}</div>
                      <div className="text-[10px] text-slate-400">
                        {user.department} • {user.level}
                      </div>
                    </td>

                    {/* ID Verification Status Column */}
                    <td className="p-3.5">
                      {user.verified || user.idVerificationStatus === 'verified' ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                          <CheckCircle2 className="w-3 h-3" /> Verified
                        </span>
                      ) : user.idVerificationStatus === 'pending' || (user.studentIdCardUrl && user.idVerificationStatus !== 'rejected') ? (
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedUser(user);
                            setIsDetailModalOpen(true);
                          }}
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/30 hover:bg-amber-500/20 transition cursor-pointer"
                        >
                          <Shield className="w-3 h-3 animate-pulse" /> Pending Review
                        </button>
                      ) : user.idVerificationStatus === 'rejected' ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20">
                          <XCircle className="w-3 h-3" /> Rejected
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] text-slate-400 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                          Unsubmitted
                        </span>
                      )}
                    </td>

                    {/* DIRECT GP WALLET BALANCE DISPLAY */}
                    <td className="p-3.5">
                      <div className="flex items-center space-x-2">
                        <Wallet className="w-4 h-4 text-amber-500" />
                        <span className="text-sm font-extrabold text-amber-600 dark:text-amber-400 bg-amber-500/10 px-2.5 py-1 rounded-lg border border-amber-500/20">
                          {user.gpBalance.toLocaleString()} GP
                        </span>
                      </div>
                    </td>

                    <td className="p-3.5">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                          user.isPostingSuspended
                            ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20'
                            : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                        }`}
                      >
                        {user.isPostingSuspended ? 'Suspended' : 'Active'}
                      </span>
                    </td>

                    <td className="p-3.5 text-right space-x-2">
                      <button
                        onClick={() => {
                          setSelectedUser(user);
                          setIsDetailModalOpen(true);
                        }}
                        className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 transition cursor-pointer"
                        title="View Full Profile"
                      >
                        <Eye className="w-4 h-4" />
                      </button>

                      <button
                        onClick={() => {
                          setSelectedUser(user);
                          setIsGpModalOpen(true);
                        }}
                        className="p-1.5 rounded-lg bg-amber-500/10 text-amber-600 hover:bg-amber-500/20 transition cursor-pointer"
                        title="Adjust GP Balance"
                      >
                        <Wallet className="w-4 h-4" />
                      </button>

                      <button
                        onClick={() => handleToggleUserSuspension(user)}
                        className={`p-1.5 rounded-lg transition cursor-pointer ${
                          user.isPostingSuspended
                            ? 'bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20'
                            : 'bg-amber-500/10 text-amber-600 hover:bg-amber-500/20'
                        }`}
                        title={user.isPostingSuspended ? 'Reactivate User' : 'Suspend User'}
                      >
                        {user.isPostingSuspended ? <CheckCircle2 className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
                      </button>

                      <button
                        onClick={() => handleOpenDeleteModal(user)}
                        className="p-1.5 rounded-lg bg-rose-500/10 text-rose-600 hover:bg-rose-500/20 transition cursor-pointer"
                        title="Delete User from Database"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* USER DETAIL MODAL */}
      {isDetailModalOpen && selectedUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-lg w-full border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden">
            <div className="p-6 bg-blue-950 text-white flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <img
                  src={selectedUser.avatar}
                  alt={selectedUser.name}
                  className="w-12 h-12 rounded-full border-2 border-blue-400 bg-slate-800"
                />
                <div>
                  <h3 className="text-lg font-bold">{selectedUser.name}</h3>
                  <p className="text-xs text-blue-200 font-mono">@{selectedUser.username} • UID: {selectedUser.id}</p>
                </div>
              </div>
              <button
                onClick={() => setIsDetailModalOpen(false)}
                className="p-1.5 rounded-lg bg-blue-900 hover:bg-blue-800 text-white transition"
              >
                ✕
              </button>
            </div>

            <div className="p-6 space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-800">
                <div>
                  <div className="text-slate-400 text-[10px] uppercase font-bold">Institution</div>
                  <div className="font-semibold text-slate-800 dark:text-white mt-0.5">{selectedUser.institution}</div>
                </div>
                <div>
                  <div className="text-slate-400 text-[10px] uppercase font-bold">Department</div>
                  <div className="font-semibold text-slate-800 dark:text-white mt-0.5">{selectedUser.department}</div>
                </div>
                <div>
                  <div className="text-slate-400 text-[10px] uppercase font-bold">Academic Level</div>
                  <div className="font-semibold text-slate-800 dark:text-white mt-0.5">{selectedUser.level}</div>
                </div>
                <div>
                  <div className="text-slate-400 text-[10px] uppercase font-bold">GP Wallet</div>
                  <div className="font-extrabold text-amber-500 mt-0.5">{selectedUser.gpBalance.toLocaleString()} GP</div>
                </div>
                <div>
                  <div className="text-slate-400 text-[10px] uppercase font-bold">Registration Method</div>
                  <div className="font-semibold text-slate-800 dark:text-white mt-0.5 flex items-center gap-1">
                    {selectedUser.authProvider?.includes('google') ? (
                      <span className="text-sky-500 flex items-center gap-1"><Globe className="w-3 h-3" /> Google SSO</span>
                    ) : selectedUser.authProvider?.includes('admin') ? (
                      <span className="text-purple-500 flex items-center gap-1"><Shield className="w-3 h-3" /> Admin Created</span>
                    ) : (
                      <span className="text-emerald-500 flex items-center gap-1"><Mail className="w-3 h-3" /> Email & Password</span>
                    )}
                  </div>
                </div>
                <div>
                  <div className="text-slate-400 text-[10px] uppercase font-bold">Registered Date</div>
                  <div className="font-semibold text-slate-800 dark:text-white mt-0.5">
                    {selectedUser.createdAt ? new Date(selectedUser.createdAt).toLocaleString() : 'Standard Registration'}
                  </div>
                </div>
              </div>

              <div>
                <div className="text-slate-400 text-[10px] uppercase font-bold mb-1">Bio</div>
                <p className="p-3 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                  {selectedUser.bio || 'No bio provided.'}
                </p>
              </div>

              {/* Student ID Card Verification Card */}
              <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/60 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 font-bold text-slate-800 dark:text-slate-200">
                    <Shield className="w-4 h-4 text-blue-500" />
                    <span>Student ID Card Verification</span>
                  </div>
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                      selectedUser.verified
                        ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                        : selectedUser.studentIdCardUrl
                        ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20'
                        : 'bg-slate-200 dark:bg-slate-800 text-slate-500'
                    }`}
                  >
                    {selectedUser.verified ? 'Verified ✓' : selectedUser.studentIdCardUrl ? 'Pending Review' : 'No ID Card Uploaded'}
                  </span>
                </div>

                {selectedUser.studentIdCardUrl ? (
                  <div className="space-y-2">
                    <div className="rounded-lg overflow-hidden border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-900 p-1 flex justify-center">
                      <img
                        src={selectedUser.studentIdCardUrl}
                        alt="Student ID Card"
                        className="max-h-40 object-contain rounded"
                        referrerPolicy="no-referrer"
                      />
                    </div>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => handleApproveVerification(selectedUser)}
                        className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg text-xs transition cursor-pointer"
                      >
                        Approve & Verify Student
                      </button>
                      <button
                        type="button"
                        onClick={() => handleRejectVerification(selectedUser)}
                        className="px-3 py-2 bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 border border-rose-500/30 font-bold rounded-lg text-xs transition cursor-pointer"
                      >
                        Reject
                      </button>
                    </div>
                  </div>
                ) : (
                  <p className="text-[11px] text-slate-400 italic">
                    This user has not yet submitted an institutional student ID card for identity verification.
                  </p>
                )}
              </div>

              <div className="pt-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => {
                    const user = selectedUser;
                    setIsDetailModalOpen(false);
                    handleOpenDeleteModal(user);
                  }}
                  className="px-3.5 py-2 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 border border-rose-500/30 text-xs font-bold flex items-center gap-1.5 transition cursor-pointer"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>Delete User</span>
                </button>

                <button
                  onClick={() => setIsDetailModalOpen(false)}
                  className="px-4 py-2 rounded-lg bg-slate-200 dark:bg-slate-800 text-slate-800 dark:text-slate-200 font-semibold cursor-pointer"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ADJUST GP MODAL */}
      {isGpModalOpen && selectedUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-md w-full border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden">
            <div className="p-6 bg-amber-600 text-white flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold">Authorized GP Wallet Adjustment</h3>
                <p className="text-xs text-amber-100">Target User: {selectedUser.name}</p>
              </div>
              <button
                onClick={() => setIsGpModalOpen(false)}
                className="p-1.5 rounded-lg bg-amber-700 hover:bg-amber-800 text-white transition"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleAdjustGpBalance} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Current GP Balance
                </label>
                <div className="p-3 rounded-lg bg-amber-500/10 text-amber-600 font-extrabold text-lg border border-amber-500/20">
                  {selectedUser.gpBalance.toLocaleString()} GP
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Adjustment Direction
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setGpAction('add')}
                    className={`py-2 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition ${
                      gpAction === 'add'
                        ? 'bg-emerald-600 text-white shadow-md'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    <PlusCircle className="w-4 h-4" /> Credit (+)
                  </button>
                  <button
                    type="button"
                    onClick={() => setGpAction('subtract')}
                    className={`py-2 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition ${
                      gpAction === 'subtract'
                        ? 'bg-rose-600 text-white shadow-md'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    <MinusCircle className="w-4 h-4" /> Debit (-)
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  GP Amount
                </label>
                <input
                  type="number"
                  min={1}
                  required
                  value={gpAmount}
                  onChange={(e) => setGpAmount(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-900 dark:text-white focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Reason for Adjustment *
                </label>
                <textarea
                  required
                  rows={2}
                  value={gpReason}
                  onChange={(e) => setGpReason(e.target.value)}
                  placeholder="e.g. Competition Reward Adjustment, System Refund..."
                  className="w-full px-3 py-2 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setIsGpModalOpen(false)}
                  className="px-4 py-2 rounded-lg border border-slate-300 text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isProcessing}
                  className="px-5 py-2 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold transition flex items-center gap-1.5 shadow-md disabled:opacity-60"
                >
                  {isProcessing ? <RefreshCw className="w-4 h-4 animate-spin" /> : 'Confirm Adjustment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CREATE / PROVISION USER ACCOUNT MODAL */}
      {isCreateUserModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-lg w-full border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden">
            <div className="p-6 bg-gradient-to-r from-emerald-700 to-teal-800 text-white flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold flex items-center gap-2">
                  <PlusCircle className="w-5 h-5" />
                  Provision User Account in Database
                </h3>
                <p className="text-xs text-emerald-100 mt-0.5">
                  Directly register or restore a scholar record into the Firestore users database.
                </p>
              </div>
              <button
                onClick={() => setIsCreateUserModalOpen(false)}
                className="p-1.5 rounded-lg bg-emerald-800 hover:bg-emerald-900 text-white transition cursor-pointer"
              >
                ✕
              </button>
            </div>

            {createSuccessMsg && (
              <div className="p-4 bg-emerald-500/10 border-b border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs font-bold flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>{createSuccessMsg}</span>
              </div>
            )}

            <form onSubmit={handleCreateUserInFirestore} className="p-6 space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Email Address *
                  </label>
                  <input
                    type="email"
                    required
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                    placeholder="student@university.edu.ng"
                    className="w-full px-3 py-2 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-medium"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Full Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    placeholder="e.g. Samuel Okon"
                    className="w-full px-3 py-2 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-medium"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Username
                  </label>
                  <input
                    type="text"
                    value={newUsername}
                    onChange={(e) => setNewUsername(e.target.value)}
                    placeholder="e.g. samuel_okon"
                    className="w-full px-3 py-2 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-medium font-mono"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Starting GP Balance
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={newStartingGp}
                    onChange={(e) => setNewStartingGp(e.target.value)}
                    placeholder="0"
                    className="w-full px-3 py-2 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-bold text-amber-500"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Institution
                </label>
                <input
                  type="text"
                  value={newInstitution}
                  onChange={(e) => setNewInstitution(e.target.value)}
                  placeholder="e.g. University of Lagos (UNILAG)"
                  className="w-full px-3 py-2 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-medium"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Department
                  </label>
                  <input
                    type="text"
                    value={newDepartment}
                    onChange={(e) => setNewDepartment(e.target.value)}
                    placeholder="e.g. Computer Science"
                    className="w-full px-3 py-2 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-medium"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Academic Level
                  </label>
                  <select
                    value={newLevel}
                    onChange={(e) => setNewLevel(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-medium"
                  >
                    <option value="100 Level">100 Level</option>
                    <option value="200 Level">200 Level</option>
                    <option value="300 Level">300 Level</option>
                    <option value="400 Level">400 Level</option>
                    <option value="500 Level">500 Level</option>
                    <option value="Postgraduate">Postgraduate</option>
                  </select>
                </div>
              </div>

              <div className="pt-4 border-t border-slate-200 dark:border-slate-800 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setIsCreateUserModalOpen(false)}
                  className="px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isCreatingUser}
                  className="px-5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold transition flex items-center gap-1.5 shadow-md disabled:opacity-60 cursor-pointer"
                >
                  {isCreatingUser ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Provisioning in Firestore...</span>
                    </>
                  ) : (
                    <>
                      <PlusCircle className="w-4 h-4" />
                      <span>Create User Record</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DELETE USER CONFIRMATION MODAL */}
      {isDeleteModalOpen && userToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-md w-full border border-rose-500/30 dark:border-rose-500/20 shadow-2xl overflow-hidden">
            <div className="p-6 bg-rose-600 text-white flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-rose-700/80 rounded-xl">
                  <AlertTriangle className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="text-lg font-bold">Delete User Account</h3>
                  <p className="text-xs text-rose-100">Permanent Database Deletion</p>
                </div>
              </div>
              <button
                onClick={() => {
                  if (!isDeletingUser) {
                    setIsDeleteModalOpen(false);
                    setUserToDelete(null);
                  }
                }}
                className="p-1.5 rounded-lg bg-rose-700 hover:bg-rose-800 text-white transition cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="p-6 space-y-4 text-xs">
              <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-700 dark:text-rose-300 space-y-1.5">
                <p className="font-bold flex items-center gap-1.5">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  Warning: This action is permanent and cannot be undone.
                </p>
                <p className="text-[11px] leading-relaxed text-slate-600 dark:text-slate-300">
                  Deleting this user will permanently remove their profile document from Firestore, release their reserved username, and purge their directory records.
                </p>
              </div>

              {/* User Summary Card */}
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-2">
                <div className="flex items-center gap-3">
                  <img
                    src={userToDelete.avatar}
                    alt={userToDelete.name}
                    className="w-10 h-10 rounded-full object-cover bg-slate-200 border border-slate-300 dark:border-slate-600"
                  />
                  <div>
                    <div className="font-bold text-slate-900 dark:text-white text-sm">
                      {userToDelete.name}
                    </div>
                    <div className="text-[11px] text-slate-500 dark:text-slate-400 font-mono">
                      @{userToDelete.username} • UID: {userToDelete.id}
                    </div>
                    {userToDelete.email && (
                      <div className="text-[11px] text-blue-600 dark:text-blue-400 font-medium">
                        {userToDelete.email}
                      </div>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-200 dark:border-slate-700 text-[11px]">
                  <div>
                    <span className="text-slate-400 uppercase font-bold text-[9px]">Institution:</span>
                    <p className="font-semibold text-slate-700 dark:text-slate-300 truncate">{userToDelete.institution}</p>
                  </div>
                  <div>
                    <span className="text-slate-400 uppercase font-bold text-[9px]">GP Balance:</span>
                    <p className="font-bold text-amber-500">{userToDelete.gpBalance.toLocaleString()} GP</p>
                  </div>
                </div>
              </div>

              {deleteErrorMsg && (
                <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-lg text-rose-600 dark:text-rose-400 text-xs font-semibold">
                  {deleteErrorMsg}
                </div>
              )}

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  Type <span className="font-mono text-rose-600 dark:text-rose-400 font-extrabold select-all">DELETE</span> to confirm:
                </label>
                <input
                  type="text"
                  value={deleteConfirmationInput}
                  onChange={(e) => setDeleteConfirmationInput(e.target.value)}
                  placeholder="Type DELETE here"
                  className="w-full px-3 py-2 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white font-mono uppercase tracking-wider text-xs focus:ring-2 focus:ring-rose-500"
                />
              </div>

              <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex justify-end space-x-2">
                <button
                  type="button"
                  disabled={isDeletingUser}
                  onClick={() => {
                    setIsDeleteModalOpen(false);
                    setUserToDelete(null);
                  }}
                  className="px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-semibold cursor-pointer disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={isDeletingUser || deleteConfirmationInput.trim().toUpperCase() !== 'DELETE'}
                  onClick={handleConfirmDeleteUser}
                  className="px-5 py-2 rounded-lg bg-rose-600 hover:bg-rose-700 text-white font-bold transition flex items-center gap-1.5 shadow-md shadow-rose-600/30 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                >
                  {isDeletingUser ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Deleting User...</span>
                    </>
                  ) : (
                    <>
                      <Trash2 className="w-4 h-4" />
                      <span>Permanently Delete</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
