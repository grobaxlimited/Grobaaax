import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { UserRole, ThemeMode, BadgeStoreItem, SubscriptionPlan, PRIMARY_SUPER_ADMIN_UID, sortSubscriptionPlans } from '../../types';
import { isPrimarySuperAdmin } from '../../lib/adminPermissions';
import { UserBadgeItem } from '../ui/UserBadgeItem';
import { BadgePurchaseModal } from './BadgePurchaseModal';
import { ProfilePictureUploader } from './ProfilePictureUploader';
import { AirtimeDataPurchaseModal } from './AirtimeDataPurchaseModal';
import { PaystackGatewayModal } from './PaystackGatewayModal';
import { ContactSupportTab } from './ContactSupportTab';
import { useDevicePlatform } from '../../hooks/useDevicePlatform';
import {
  ACADEMIC_STRUCTURE_BY_CATEGORY,
  getFacultiesByCategory,
  getDepartmentsByFaculty,
  getAllDepartmentsByCategory,
} from '../../data/academicStructureData';
import {
  db,
  auth,
  doc,
  deleteDoc,
  deleteUser,
  updatePassword,
  reauthenticateWithCredential,
  EmailAuthProvider,
  sendPasswordResetEmail,
  sendEmailVerification,
  isSubscriptionExpired,
} from '../../lib/firebase';
import {
  Wallet,
  Coins,
  Sparkles,
  Award,
  ShieldCheck,
  Check,
  Moon,
  Sun,
  Laptop,
  GraduationCap,
  Bell,
  X,
  Lock,
  Eye,
  EyeOff,
  ShoppingBag,
  Banknote,
  Building2,
  Bot,
  Plus,
  History,
  Crown,
  CheckCircle2,
  XCircle,
  Edit,
  User,
  Sliders,
  Shield,
  CreditCard,
  Camera,
  AlertCircle,
  RefreshCw,
  Zap,
  Flame,
  Medal,
  ExternalLink,
  ChevronRight,
  Trash2,
  Smartphone,
  Wifi,
  Phone,
  KeyRound,
  Key,
  Settings,
  MailCheck,
  ShieldAlert,
  Info,
  CheckCircle,
  ArrowUpRight,
  ArrowDownRight,
  Headphones,
  Search,
  Filter,
  Receipt,
  BookOpen,
  School,
  Trophy,
  Star,
  Target,
} from 'lucide-react';

const STANDARD_ACADEMIC_LEVELS = [
  '100 Level',
  '200 Level',
  '300 Level',
  '400 Level',
  '500 Level',
  '600 Level',
  'ND1',
  'ND2',
  'HND1',
  'HND2',
  'Postgraduate',
];

export const WalletModal: React.FC = () => {
  const { isIOS } = useDevicePlatform();
  const {
    isWalletModalOpen,
    setIsWalletModalOpen,
    currentUser,
    role,
    setRole,
    toggleRepresentativeStatus,
    theme,
    setTheme,
    openAuthModal,
    logout,
    firebaseUser,
    badgeStore,
    buyBadge,
    equipBadge,
    withdrawals,
    requestGpWithdrawal,
    updatePrivacy,
    updateUserProfile,
    transactions,
    gpConversionConfig,
    systemSettings,
    upgradePlans,
    walletModalTab,
    setWalletModalTab,
    subscriptionPlans,
    activeSubscriptionPlans,
    freeScholarPlan,
    subscribeToPlan,
    notifications,
    markNotificationRead,
    masterInstitutions,
    isBalanceHidden,
    toggleBalanceHidden,
    isUserSubscribed,
  } = useApp();

  const effectiveMinGp = Number(
    (typeof systemSettings?.minWithdrawalAmountGp === 'number' && systemSettings.minWithdrawalAmountGp > 0)
      ? systemSettings.minWithdrawalAmountGp
      : (typeof gpConversionConfig?.minimumWithdrawalGP === 'number' && gpConversionConfig.minimumWithdrawalGP > 0)
        ? gpConversionConfig.minimumWithdrawalGP
        : 1000
  );

  const effectiveRate = Number(
    (typeof systemSettings?.gpToFiatRate === 'number' && systemSettings.gpToFiatRate > 0)
      ? systemSettings.gpToFiatRate
      : (typeof gpConversionConfig?.gpToFiatRate === 'number' && gpConversionConfig.gpToFiatRate > 0)
        ? gpConversionConfig.gpToFiatRate
        : 1
  );

  const [activeTab, setActiveTab] = useState<
    'profile' | 'airtime_data' | 'privacy' | 'withdraw' | 'history' | 'upgrade' | 'contact'
  >((walletModalTab as string) === 'admin' ? 'profile' : walletModalTab || 'profile');

  // Plan Upgrade / Checkout Modal State
  const [selectedPlanForUpgrade, setSelectedPlanForUpgrade] = useState<SubscriptionPlan | null>(null);
  const [upgradePaymentMethod, setUpgradePaymentMethod] = useState<'CARD' | 'GP' | 'TRANSFER'>('CARD');
  const [isUpgrading, setIsUpgrading] = useState(false);
  const [upgradeResult, setUpgradeResult] = useState<{ success: boolean; message: string } | null>(null);
  const [isPaystackOpen, setIsPaystackOpen] = useState(false);

  // Escape key listener & body scroll lock
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isWalletModalOpen) {
        setIsWalletModalOpen(false);
      }
    };
    if (isWalletModalOpen) {
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', handleKeyDown);
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isWalletModalOpen, setIsWalletModalOpen]);

  // Sync activeTab when walletModalTab changes
  useEffect(() => {
    if (walletModalTab && (walletModalTab as string) !== 'admin') {
      setActiveTab(walletModalTab);
    }
  }, [walletModalTab, isWalletModalOpen]);

  // Edit Profile state
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [editName, setEditName] = useState(currentUser.name || currentUser.fullName || '');
  const [editUsername, setEditUsername] = useState(currentUser.username || '');
  const [editBio, setEditBio] = useState(currentUser.bio || '');
  const [editInstitution, setEditInstitution] = useState(currentUser.institution || currentUser.institutionName || '');
  const [editFaculty, setEditFaculty] = useState(currentUser.faculty || currentUser.facultyName || '');
  const [editDepartment, setEditDepartment] = useState(currentUser.department || currentUser.departmentName || '');
  const [editLevel, setEditLevel] = useState(currentUser.level || '100 Level');

  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [profileSaveSuccess, setProfileSaveSuccess] = useState(false);
  const [profileSaveError, setProfileSaveError] = useState<string | null>(null);

  // Withdrawal Form State
  const [withdrawGpAmount, setWithdrawGpAmount] = useState<number>(effectiveMinGp);
  const [bankName, setBankName] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [withdrawalMessage, setWithdrawalMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Sync default withdraw amount when config loads or changes
  useEffect(() => {
    if (effectiveMinGp) {
      setWithdrawGpAmount((prev) => (!prev || prev < effectiveMinGp ? effectiveMinGp : prev));
    }
  }, [effectiveMinGp]);

  // Badge Modal State
  const [selectedBadgeForPurchase, setSelectedBadgeForPurchase] = useState<BadgeStoreItem | null>(null);
  const [achievementFilter, setAchievementFilter] = useState<'all' | 'unlocked' | 'equipped' | 'store'>('all');

  // User Ledger Filter States
  const [ledgerSearchTerm, setLedgerSearchTerm] = useState('');
  const [ledgerDirectionFilter, setLedgerDirectionFilter] = useState<'all' | 'credit' | 'debit'>('all');
  const [ledgerTypeFilter, setLedgerTypeFilter] = useState<string>('all');

  // Settings Filter & Password Management State
  const [settingsSection, setSettingsSection] = useState<
    'all' | 'password' | 'privacy' | 'notifications' | 'appearance' | 'account'
  >('all');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);
  const [passwordSuccessMessage, setPasswordSuccessMessage] = useState<string | null>(null);
  const [passwordErrorMessage, setPasswordErrorMessage] = useState<string | null>(null);

  const [isSendingResetEmail, setIsSendingResetEmail] = useState(false);
  const [resetEmailSuccessMessage, setResetEmailSuccessMessage] = useState<string | null>(null);
  const [resetEmailErrorMessage, setResetEmailErrorMessage] = useState<string | null>(null);

  const [isSendingVerificationEmail, setIsSendingVerificationEmail] = useState(false);
  const [verificationEmailSuccess, setVerificationEmailSuccess] = useState<string | null>(null);
  const [verificationEmailError, setVerificationEmailError] = useState<string | null>(null);

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordSuccessMessage(null);
    setPasswordErrorMessage(null);

    if (!auth.currentUser) {
      setPasswordErrorMessage('Please sign in with your verified account to change your password.');
      return;
    }

    if (newPassword.length < 6) {
      setPasswordErrorMessage('New password must contain at least 6 characters.');
      return;
    }

    if (newPassword !== confirmNewPassword) {
      setPasswordErrorMessage('New passwords do not match. Please re-enter your confirmation password.');
      return;
    }

    setIsUpdatingPassword(true);

    try {
      const user = auth.currentUser;
      const hasPasswordProvider = user.providerData.some(p => p.providerId === 'password');

      if (hasPasswordProvider && currentPassword) {
        const credential = EmailAuthProvider.credential(user.email || currentUser.email, currentPassword);
        await reauthenticateWithCredential(user, credential);
      }

      await updatePassword(user, newPassword);
      setPasswordSuccessMessage('Password updated successfully! Your account is now secured with your new password.');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmNewPassword('');
      setTimeout(() => {
        setPasswordSuccessMessage(null);
      }, 6000);
    } catch (err: any) {
      console.error('Password update error:', err);
      if (err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential') {
        setPasswordErrorMessage('Current password is incorrect. Please verify your existing password.');
      } else if (err.code === 'auth/requires-recent-login') {
        setPasswordErrorMessage('For security reasons, your login session has expired for sensitive updates. Please sign out and sign back in, or use the email password reset button below.');
      } else if (err.code === 'auth/weak-password') {
        setPasswordErrorMessage('Password is too weak. Please use a mix of letters, numbers, and symbols.');
      } else {
        setPasswordErrorMessage(err.message || 'Failed to update password. Please try again or request a reset link.');
      }
    } finally {
      setIsUpdatingPassword(false);
    }
  };

  const handleSendResetPasswordEmail = async () => {
    const targetEmail = auth.currentUser?.email || currentUser.email;
    if (!targetEmail) {
      setResetEmailErrorMessage('No registered email address found for this account.');
      return;
    }

    setIsSendingResetEmail(true);
    setResetEmailSuccessMessage(null);
    setResetEmailErrorMessage(null);

    try {
      await sendPasswordResetEmail(auth, targetEmail);
      setResetEmailSuccessMessage(`Official password reset instructions have been dispatched to ${targetEmail}. Please check your inbox and spam folder.`);
      setTimeout(() => {
        setResetEmailSuccessMessage(null);
      }, 7000);
    } catch (err: any) {
      console.error('Send reset email error:', err);
      setResetEmailErrorMessage(err.message || 'Could not send password reset email. Please try again.');
    } finally {
      setIsSendingResetEmail(false);
    }
  };

  const handleSendEmailVerification = async () => {
    if (!auth.currentUser) return;
    setIsSendingVerificationEmail(true);
    setVerificationEmailSuccess(null);
    setVerificationEmailError(null);

    try {
      await sendEmailVerification(auth.currentUser);
      setVerificationEmailSuccess('Verification email sent! Please check your inbox and click the verification link.');
      setTimeout(() => {
        setVerificationEmailSuccess(null);
      }, 6000);
    } catch (err: any) {
      console.error('Email verification error:', err);
      setVerificationEmailError(err.message || 'Failed to send verification email. Please try again later.');
    } finally {
      setIsSendingVerificationEmail(false);
    }
  };

  // Account Deletion State
  const [showDeleteAccountModal, setShowDeleteAccountModal] = useState(false);
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const handleDeleteAccount = async () => {
    setIsDeletingAccount(true);
    setDeleteError(null);
    try {
      if (currentUser?.id) {
        await deleteDoc(doc(db, 'users', currentUser.id));
      }
      if (auth.currentUser) {
        await deleteUser(auth.currentUser).catch((err) => {
          console.warn('Firebase auth delete error (reauth may be needed):', err);
        });
      }
      setShowDeleteAccountModal(false);
      setIsWalletModalOpen(false);
      logout();
    } catch (err: any) {
      console.error('Account deletion error:', err);
      setDeleteError(err?.message || 'Failed to delete account. Please re-authenticate and try again.');
    } finally {
      setIsDeletingAccount(false);
    }
  };

  if (!isWalletModalOpen) return null;

  // Derive category and available faculties & departments
  const currentSelectedInstObj = masterInstitutions.find(i => i.name === editInstitution);
  const activeCategory = (currentSelectedInstObj?.type || currentUser.institutionCategory || 'University') as any;
  const availableFaculties = getFacultiesByCategory(activeCategory);
  const facultyLabel = (ACADEMIC_STRUCTURE_BY_CATEGORY[activeCategory as keyof typeof ACADEMIC_STRUCTURE_BY_CATEGORY]?.facultyLabel) || 'Faculty';

  const availableDepartments = editFaculty
    ? getDepartmentsByFaculty(activeCategory, editFaculty)
    : (currentSelectedInstObj?.departments && currentSelectedInstObj.departments.length > 0
        ? currentSelectedInstObj.departments
        : getAllDepartmentsByCategory(activeCategory));

  // Open editor and reset form state
  const handleOpenEditProfile = () => {
    setEditName(currentUser.name || currentUser.fullName || '');
    setEditUsername(currentUser.username || '');
    setEditBio(currentUser.bio || '');
    setEditInstitution(currentUser.institution || currentUser.institutionName || (masterInstitutions[0]?.name || ''));
    setEditFaculty(currentUser.faculty || currentUser.facultyName || '');
    setEditDepartment(currentUser.department || currentUser.departmentName || (masterInstitutions[0]?.departments?.[0] || 'Computer Science'));
    setEditLevel(currentUser.level || '100 Level');
    setProfileSaveError(null);
    setProfileSaveSuccess(false);
    setIsEditingProfile(true);
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingProfile(true);
    setProfileSaveError(null);
    setProfileSaveSuccess(false);

    try {
      await updateUserProfile({
        name: editName.trim(),
        fullName: editName.trim(),
        username: editUsername.trim().replace(/^@/, ''),
        bio: editBio.trim(),
        level: editLevel,
      });

      setProfileSaveSuccess(true);
      setTimeout(() => {
        setIsEditingProfile(false);
        setProfileSaveSuccess(false);
      }, 1500);
    } catch (err: any) {
      setProfileSaveError(err.message || 'Failed to save profile changes. Please try again.');
    } finally {
      setIsSavingProfile(false);
    }
  };

  const handleSaveAvatar = async (newAvatarUrl: string) => {
    await updateUserProfile({
      avatar: newAvatarUrl,
      profileImage: newAvatarUrl,
    });
  };

  const handleWithdraw = (e: React.FormEvent) => {
    e.preventDefault();
    setWithdrawalMessage(null);

    const isFreeScholar =
      !isUserSubscribed &&
      (!currentUser.membershipTier || currentUser.membershipTier.toLowerCase().includes('free')) &&
      (!currentUser.subscriptionTier || currentUser.subscriptionTier.toLowerCase().includes('free'));

    if (isFreeScholar && !currentUser.isRepresentative && role !== 'admin') {
      setWithdrawalMessage({
        type: 'error',
        text: '🔒 Direct bank cashout is exclusive to upgraded scholar tiers (Scholar Starter, Champions Pro, or Titan VIP). Please upgrade your tier or redeem for instant Airtime & Data.',
      });
      return;
    }

    const minGp = effectiveMinGp;

    if (withdrawGpAmount < minGp) {
      setWithdrawalMessage({
        type: 'error',
        text: `Minimum cash out withdrawal is ${minGp.toLocaleString()} GP.`,
      });
      return;
    }
    if (withdrawGpAmount > (currentUser.gpBalance ?? 0)) {
      setWithdrawalMessage({
        type: 'error',
        text: `Insufficient GP balance. You currently have ${(currentUser.gpBalance ?? 0).toLocaleString()} GP.`,
      });
      return;
    }
    if (!bankName.trim() || !accountNumber.trim()) {
      setWithdrawalMessage({
        type: 'error',
        text: 'Please provide a valid Nigerian bank name and 10-digit account number.',
      });
      return;
    }

    const success = requestGpWithdrawal(withdrawGpAmount, bankName.trim(), accountNumber.trim(), currentUser.name);
    if (success) {
      setWithdrawalMessage({
        type: 'success',
        text: `🎉 Withdrawal request of ${withdrawGpAmount.toLocaleString()} GP submitted successfully. Processed within 24-48 business hours.`,
      });
      setWithdrawGpAmount(minGp);
      setBankName('');
      setAccountNumber('');
    } else {
      setWithdrawalMessage({
        type: 'error',
        text: 'Withdrawal failed. Please check your GP balance.',
      });
    }
  };

  const authoritativeGpBalance = (
    typeof currentUser.gpBalance === 'number' ? currentUser.gpBalance : Number(currentUser.gpBalance || 0)
  ).toLocaleString();

  if (!isWalletModalOpen) return null;

  return (
    <div
      id="profile-account-hub-modal"
      className="fixed inset-0 z-50 flex flex-col w-full h-full bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 animate-in fade-in duration-200 overflow-hidden"
    >
      {/* Dedicated iPhone/iOS Status Bar & Notch/Dynamic Island Safe-Area Guard */}
      {isIOS && (
        <div
          id="profile-hub-ios-status-guard"
          aria-hidden="true"
          className="w-full shrink-0 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md select-none pointer-events-none transition-colors"
          style={{
            height: 'max(env(safe-area-inset-top, 0px), 48px)',
          }}
        />
      )}

      {/* Top Header (Full-Width Sticky Header - positioned cleanly below iOS system safe area) */}
      <div
        id="profile-hub-header"
        className="sticky top-0 z-30 flex items-center justify-between px-4 sm:px-8 py-3.5 sm:py-4 border-b border-slate-200 dark:border-slate-800 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md shrink-0 shadow-xs"
      >
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-gradient-to-br from-blue-900/30 to-blue-800/30 text-blue-900 dark:text-blue-400 rounded-2xl border border-blue-500/30 shadow-xs">
            <Wallet className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base sm:text-lg font-black text-slate-900 dark:text-slate-100 tracking-tight">
                Profile & Account Hub
              </h2>
              {currentUser.isRepresentative && (
                <span className="px-2 py-0.5 text-[10px] font-black rounded-md bg-amber-500/10 text-amber-500 border border-amber-500/30 uppercase tracking-wider flex items-center gap-1">
                  <Award className="w-3 h-3 text-amber-400" />
                  Representative
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 hidden sm:block">
              Authoritative Grobaax Scholar Profile, GP Wallet, Badges & Security.
            </p>
          </div>
        </div>

        {/* Right Header Actions */}
        <div className="flex items-center gap-2.5">
          <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 text-xs font-bold text-blue-900 dark:text-blue-300">
            <Coins className="w-4 h-4 text-amber-400" />
            <span>{isBalanceHidden ? '•••• GP' : `${authoritativeGpBalance} GP`}</span>
            <button
              type="button"
              onClick={toggleBalanceHidden}
              className="ml-1 text-slate-400 hover:text-blue-500 dark:hover:text-blue-400 cursor-pointer"
              title={isBalanceHidden ? 'Reveal GP Balance' : 'Hide GP Balance (Private Mode)'}
            >
              {isBalanceHidden ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
            </button>
          </div>

          <button
            onClick={() => setIsWalletModalOpen(false)}
            className="flex items-center gap-1.5 px-3.5 py-2 text-slate-700 dark:text-slate-200 hover:text-slate-900 dark:hover:text-white rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 font-bold text-xs transition-all cursor-pointer border border-slate-200 dark:border-slate-700 shadow-xs"
            title="Close modal and return to campus"
          >
            <X className="w-4 h-4" />
            <span className="font-bold">Close</span>
          </button>
        </div>
      </div>

      {/* Sticky Tab Navigation */}
      <div className="relative z-20 flex items-center gap-1.5 px-4 sm:px-8 py-2.5 bg-slate-100/95 dark:bg-slate-950/95 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 overflow-x-auto no-scrollbar shrink-0">
        {[
          { id: 'profile', label: 'Profile & Achievements', icon: User },
          { id: 'airtime_data', label: 'Airtime & Data', icon: Smartphone, badge: 'VTU' },
          { id: 'privacy', label: 'Settings & Security', icon: Settings },
          { id: 'withdraw', label: 'Cash Out GP', icon: Banknote },
          { id: 'history', label: 'Transaction Logs', icon: History },
          { id: 'upgrade', label: 'Membership Tiers', icon: Crown },
          { id: 'contact', label: 'Contact Us', icon: Headphones, badge: 'Support' },
        ].map(tab => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-3.5 py-2 rounded-xl text-xs font-extrabold transition-all flex items-center gap-2 whitespace-nowrap cursor-pointer ${
                isActive
                  ? 'bg-blue-600 dark:bg-blue-600 text-white shadow-md shadow-blue-600/20'
                  : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white border border-slate-200 dark:border-slate-800'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
              {tab.badge && (
                <span
                  className={`px-1.5 py-0.5 rounded-md text-[9px] font-extrabold ${
                    isActive
                      ? 'bg-white/20 text-white'
                      : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30'
                  }`}
                >
                  {tab.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Main Full-Screen Body Scroll Container */}
      <div className="flex-1 overflow-y-auto w-full p-4 sm:p-6 md:p-8">
        <div className="max-w-7xl mx-auto w-full space-y-6">
          {/* TAB 1: PROFILE & ACHIEVEMENTS */}
          {activeTab === 'profile' && (
            <div className="space-y-6">
              {/* Profile Card Summary - 100% Solid Opaque Executive Canvas */}
              <div className="p-6 sm:p-7 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5">
                  <div className="relative group shrink-0">
                    <img
                      src={currentUser.avatar || currentUser.profileImage}
                      alt={currentUser.name}
                      className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl object-cover border-2 border-slate-300 dark:border-slate-700 shadow-sm bg-slate-100 dark:bg-slate-800"
                      referrerPolicy="no-referrer"
                    />
                    {currentUser.equippedBadge ? (
                      <div
                        className="absolute -bottom-2 -right-2 p-1.5 rounded-xl bg-amber-500 text-slate-950 font-black text-sm shadow-md flex items-center justify-center border-2 border-white dark:border-slate-900"
                        title={`Equipped Badge: ${typeof currentUser.equippedBadge === 'object' ? (currentUser.equippedBadge.name || currentUser.equippedBadge.title || 'Badge') : currentUser.equippedBadge}`}
                      >
                        <span>{typeof currentUser.equippedBadge === 'object' ? (currentUser.equippedBadge.icon || '🎖️') : '🎖️'}</span>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => {
                          if (!isEditingProfile) handleOpenEditProfile();
                        }}
                        className="absolute -bottom-1 -right-1 p-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white shadow-md transition-all cursor-pointer border-2 border-white dark:border-slate-900"
                        title="Change profile picture"
                      >
                        <Camera className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center gap-2.5 flex-wrap">
                      <UserBadgeItem
                        name={currentUser.name || currentUser.fullName}
                        verified={currentUser.verified !== false}
                        isPremium={!isSubscriptionExpired(currentUser) && (currentUser.isPremium || (Boolean(currentUser.membershipTier) && !currentUser.membershipTier?.toLowerCase().includes('free')))}
                        membershipTier={isSubscriptionExpired(currentUser) ? 'Free Scholar' : currentUser.membershipTier}
                        subscriptionExpiry={currentUser.subscriptionExpiry}
                        equippedBadge={currentUser.equippedBadge}
                        size="lg"
                      />
                      {currentUser.isRepresentative && (
                        <span className="px-2.5 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-200 border border-amber-300 dark:border-amber-700 font-extrabold text-[11px] uppercase tracking-wider flex items-center gap-1">
                          <Award className="w-3 h-3" />
                          Official Representative
                        </span>
                      )}
                      <span className="px-2.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700 font-bold text-[11px]">
                        {isSubscriptionExpired(currentUser) ? 'Free Scholar' : (currentUser.membershipTier || 'Free Scholar')}
                      </span>
                    </div>

                    <div className="text-xs font-semibold text-slate-600 dark:text-slate-300 flex items-center gap-2 flex-wrap">
                      <span className="text-blue-600 dark:text-blue-400 font-black">@{currentUser.username || 'scholar'}</span>
                      <span className="text-slate-400 dark:text-slate-600">•</span>
                      <span className="font-bold text-slate-900 dark:text-white flex items-center gap-1">
                        <School className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                        {currentUser.institution || currentUser.academicProfile?.institutionName || 'Higher Education Scholar'}
                      </span>
                      {currentUser.faculty && (
                        <>
                          <span className="text-slate-400 dark:text-slate-600">•</span>
                          <span className="truncate max-w-[220px]">{currentUser.faculty}</span>
                        </>
                      )}
                      <span className="text-slate-400 dark:text-slate-600">•</span>
                      <span className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-extrabold border border-slate-200 dark:border-slate-700">
                        {currentUser.level || '100 Level'}
                      </span>
                    </div>

                    <p className="text-xs text-slate-700 dark:text-slate-200 mt-1 max-w-2xl leading-relaxed bg-slate-50 dark:bg-slate-800 p-3 rounded-xl border border-slate-200 dark:border-slate-700 font-medium">
                      {currentUser.bio || 'Verified academic scholar participating in the Grobaax inter-campus leagues, GUS tournaments, and intellectual competitions.'}
                    </p>
                  </div>
                </div>

                <div className="flex sm:flex-row md:flex-col gap-2.5 w-full md:w-auto shrink-0 pt-2 md:pt-0">
                  <button
                    onClick={() => {
                      if (isEditingProfile) {
                        setIsEditingProfile(false);
                      } else {
                        handleOpenEditProfile();
                      }
                    }}
                    className="flex-1 md:flex-initial px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-black rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer shadow-md shadow-blue-500/20"
                  >
                    <Edit className="w-3.5 h-3.5" />
                    <span>{isEditingProfile ? 'Close Editor' : 'Edit Profile'}</span>
                  </button>
                </div>
              </div>

              {/* Authoritative 4-Pillar Academic & Treasury Grid (100% Solid Opaque High-Legibility Surfaces) */}
              {(() => {
                const userInstitutionName = currentUser.institution || currentUser.academicProfile?.institutionName || 'Federal Polytechnic, Ado-Ekiti';
                const matchedInstitution = masterInstitutions.find(
                  inst => inst.name?.toLowerCase().trim() === userInstitutionName.toLowerCase().trim() ||
                          inst.shortName?.toLowerCase().trim() === userInstitutionName.toLowerCase().trim()
                );
                const rawGp = typeof currentUser.gpBalance === 'number' ? currentUser.gpBalance : Number(currentUser.gpBalance || 0);
                const estimatedNaira = (rawGp * effectiveRate).toLocaleString();
                const facultyName = currentUser.faculty || currentUser.academicProfile?.faculty || 'School of Engineering Technology';
                const deptName = currentUser.department || currentUser.academicProfile?.department || 'Electrical / Electronics Engineering Technology';
                const levelName = currentUser.level || currentUser.academicProfile?.level || 'Post-Grad';
                const matricNumber = currentUser.matricNumber || currentUser.academicProfile?.matricNumber;
                const progressToMinWithdraw = Math.min(100, Math.round((rawGp / effectiveMinGp) * 100));

                return (
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                    {/* PILLAR 1: Authoritative GP Balance & Treasury Ledger */}
                    <div className="p-6 sm:p-7 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between min-h-[310px] space-y-5">
                      <div className="space-y-4">
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-blue-100 dark:bg-blue-950 text-blue-900 dark:text-blue-200 border border-blue-200 dark:border-blue-800 text-xs font-black uppercase tracking-wider">
                            <Sparkles className="w-3.5 h-3.5 text-amber-500 animate-pulse" />
                            <span>Authoritative GP Balance</span>
                          </div>

                          <button
                            type="button"
                            onClick={toggleBalanceHidden}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 text-xs font-bold transition-all cursor-pointer shadow-xs"
                            title={isBalanceHidden ? 'Reveal GP Balance' : 'Hide GP Balance (Private Mode)'}
                          >
                            {isBalanceHidden ? <EyeOff className="w-3.5 h-3.5 text-amber-500" /> : <Eye className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />}
                            <span>{isBalanceHidden ? 'Private' : 'Visible'}</span>
                          </button>
                        </div>

                        <div>
                          <div className="text-3xl sm:text-4xl font-black text-slate-900 dark:text-white tracking-tight flex items-baseline gap-2">
                            <span>{isBalanceHidden ? '••••••••' : authoritativeGpBalance}</span>
                            <span className="text-xl sm:text-2xl font-black text-blue-600 dark:text-blue-400 tracking-wider">GP</span>
                          </div>

                          <div className="text-xs font-semibold text-slate-600 dark:text-slate-300 mt-1">
                            ≈ ₦{isBalanceHidden ? '••••••' : estimatedNaira} NGN <span className="text-slate-500 dark:text-slate-400 font-medium">(Official rate: 1 GP = ₦{effectiveRate} NGN)</span>
                          </div>

                          <div className="flex items-center gap-2 sm:gap-3 flex-wrap mt-3.5">
                            <span className="px-3 py-1.5 rounded-xl bg-emerald-100 dark:bg-emerald-950 text-emerald-900 dark:text-emerald-200 border border-emerald-300 dark:border-emerald-700 text-xs font-black flex items-center gap-1.5">
                              <Zap className="w-3.5 h-3.5 text-amber-500" />
                              <span>{isUserSubscribed ? '2.0x Boost Multiplier Active' : '1.0x Standard Scholar Rate'}</span>
                            </span>

                            <span className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700 text-xs font-bold flex items-center gap-1.5">
                              <Coins className="w-3.5 h-3.5 text-amber-500" />
                              <span>{rawGp >= effectiveMinGp ? '✅ Qualified for Direct Cash Out' : `Min Cash Out: ${effectiveMinGp.toLocaleString()} GP`}</span>
                            </span>
                          </div>

                          {/* Progress bar to min cashout */}
                          <div className="mt-3.5 space-y-1.5 bg-slate-50 dark:bg-slate-800 p-3 rounded-2xl border border-slate-200 dark:border-slate-700">
                            <div className="flex justify-between items-center text-[11px] font-bold text-slate-600 dark:text-slate-300">
                              <span>Cash Out Progress</span>
                              <span className="text-blue-600 dark:text-blue-400 font-extrabold">{progressToMinWithdraw}% of Target</span>
                            </div>
                            <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2 overflow-hidden">
                              <div
                                className="bg-blue-600 h-2 rounded-full transition-all duration-500"
                                style={{ width: `${progressToMinWithdraw}%` }}
                              />
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="grid grid-cols-3 gap-2.5 pt-4 border-t border-slate-200 dark:border-slate-800">
                        <button
                          type="button"
                          onClick={() => setActiveTab('airtime_data')}
                          className="px-3 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs transition-all flex flex-col sm:flex-row items-center justify-center gap-1.5 cursor-pointer shadow-sm text-center"
                        >
                          <Smartphone className="w-4 h-4 text-emerald-100 shrink-0" />
                          <span className="truncate">Airtime / Data</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => setActiveTab('withdraw')}
                          className="px-3 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-black text-xs transition-all flex flex-col sm:flex-row items-center justify-center gap-1.5 cursor-pointer shadow-md shadow-blue-500/20 text-center"
                        >
                          <Banknote className="w-4 h-4 text-blue-100 shrink-0" />
                          <span className="truncate">Cash Out</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => setActiveTab('history')}
                          className="px-3 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 font-bold text-xs transition-all flex flex-col sm:flex-row items-center justify-center gap-1.5 cursor-pointer text-center"
                        >
                          <History className="w-4 h-4 text-slate-500 dark:text-slate-400 shrink-0" />
                          <span className="truncate">Logs</span>
                        </button>
                      </div>
                    </div>

                    {/* PILLAR 2: Institutional Status & Academic Credentials */}
                    <div className="p-6 sm:p-7 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between min-h-[310px] space-y-5">
                      <div className="space-y-4">
                        <div className="flex items-center justify-between gap-2 flex-wrap">
                          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-indigo-100 dark:bg-indigo-950 text-indigo-900 dark:text-indigo-200 border border-indigo-200 dark:border-indigo-800 text-xs font-black uppercase tracking-wider">
                            <School className="w-3.5 h-3.5 text-indigo-500" />
                            <span>Institutional Status</span>
                          </div>

                          <div className="flex items-center gap-1.5">
                            {currentUser.isRepresentative ? (
                              <span className="px-3 py-1 rounded-full bg-amber-100 dark:bg-amber-950 border border-amber-300 dark:border-amber-700 text-amber-900 dark:text-amber-200 text-[11px] font-black uppercase tracking-wider flex items-center gap-1">
                                <Award className="w-3.5 h-3.5" />
                                Official Representative
                              </span>
                            ) : (
                              <span className="px-3 py-1 rounded-full bg-emerald-100 dark:bg-emerald-950 border border-emerald-300 dark:border-emerald-700 text-emerald-900 dark:text-emerald-200 text-[11px] font-black uppercase tracking-wider flex items-center gap-1">
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                Verified Student Member
                              </span>
                            )}
                          </div>
                        </div>

                        <div>
                          <h3 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white flex items-center gap-2">
                            <GraduationCap className="w-5 h-5 text-blue-600 dark:text-blue-400 shrink-0" />
                            <span className="leading-snug">{userInstitutionName}</span>
                          </h3>
                          <div className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-300 mt-1.5 flex-wrap font-medium">
                            <span className="px-2.5 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-indigo-700 dark:text-indigo-300 text-xs font-bold border border-slate-200 dark:border-slate-700">
                              {matchedInstitution?.category || (currentUser.academicProfile as any)?.category || currentUser.academicProfile?.institutionCategory || 'Higher Education Institution'}
                            </span>
                            {matchedInstitution?.state && (
                              <span className="font-semibold">• {matchedInstitution.state} State</span>
                            )}
                            {(matchedInstitution as any)?.motto && (
                              <span className="italic text-slate-500 dark:text-slate-400">"{(matchedInstitution as any).motto}"</span>
                            )}
                          </div>
                        </div>

                        {/* Academic Specifics Grid (Solid Opaque High-Legibility Boxes) */}
                        <div className="grid grid-cols-2 gap-3 pt-1 text-xs">
                          <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 space-y-0.5">
                            <div className="text-[10px] text-slate-500 dark:text-slate-400 font-extrabold uppercase tracking-wider">Faculty</div>
                            <div className="font-bold text-slate-900 dark:text-slate-100 truncate" title={facultyName}>
                              {facultyName}
                            </div>
                          </div>

                          <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 space-y-0.5">
                            <div className="text-[10px] text-slate-500 dark:text-slate-400 font-extrabold uppercase tracking-wider">Department</div>
                            <div className="font-bold text-slate-900 dark:text-slate-100 truncate" title={deptName}>
                              {deptName}
                            </div>
                          </div>

                          <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 space-y-0.5">
                            <div className="text-[10px] text-slate-500 dark:text-slate-400 font-extrabold uppercase tracking-wider">Academic Level</div>
                            <div className="font-bold text-blue-600 dark:text-blue-400 truncate">
                              {levelName}
                            </div>
                          </div>

                          <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 space-y-0.5">
                            <div className="text-[10px] text-slate-500 dark:text-slate-400 font-extrabold uppercase tracking-wider">Student ID / Matric</div>
                            <div className="font-bold text-amber-600 dark:text-amber-400 truncate">
                              {matricNumber || `@${currentUser.username || 'scholar'}`}
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="pt-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs text-slate-600 dark:text-slate-400 mt-4">
                        <span className="flex items-center gap-1.5 font-bold">
                          <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                          Academic record verified on campus ledger
                        </span>
                        <button
                          type="button"
                          onClick={() => handleOpenEditProfile()}
                          className="text-blue-600 dark:text-blue-400 font-black hover:underline cursor-pointer"
                        >
                          Edit Details →
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })()}

              {/* Comprehensive Profile Editor Form (100% Solid Opaque High-Legibility) */}
              {isEditingProfile && (
                <form
                  onSubmit={handleSaveProfile}
                  className="p-6 sm:p-7 rounded-3xl bg-white dark:bg-slate-900 border-2 border-blue-500 space-y-5 shadow-lg animate-in fade-in"
                >
                  <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
                    <div className="flex items-center gap-2">
                      <GraduationCap className="w-5 h-5 text-blue-500" />
                      <h3 className="text-sm sm:text-base font-black text-slate-900 dark:text-slate-100">
                        Edit Official Scholar Profile & Academic Credentials
                      </h3>
                    </div>
                    <span className="text-xs text-blue-700 dark:text-blue-300 font-bold bg-blue-100 dark:bg-blue-950 px-2.5 py-1 rounded-lg border border-blue-200 dark:border-blue-800">
                      Campus Ledger Synced
                    </span>
                  </div>

                  {/* Profile Photo Uploader inside Editor */}
                  <ProfilePictureUploader
                    currentAvatar={currentUser.avatar || currentUser.profileImage}
                    onSaveAvatar={handleSaveAvatar}
                  />

                  {profileSaveSuccess && (
                    <div className="p-3.5 rounded-xl bg-emerald-100 dark:bg-emerald-950 border border-emerald-300 dark:border-emerald-700 text-emerald-900 dark:text-emerald-200 text-xs font-bold flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-500" />
                      <span>🎉 Scholar profile updated successfully! Changes reflected across the platform.</span>
                    </div>
                  )}

                  {profileSaveError && (
                    <div className="p-3.5 rounded-xl bg-rose-100 dark:bg-rose-950 border border-rose-300 dark:border-rose-700 text-rose-900 dark:text-rose-200 text-xs font-bold flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
                      <span>{profileSaveError}</span>
                    </div>
                  )}

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                        Full Name
                      </label>
                      <input
                        type="text"
                        value={editName}
                        onChange={e => setEditName(e.target.value)}
                        placeholder="e.g. Abdulazeez Ibrahim"
                        className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-slate-100 font-bold focus:outline-none focus:ring-2 focus:ring-blue-500"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                        Scholar Username (@)
                      </label>
                      <input
                        type="text"
                        value={editUsername}
                        onChange={e => setEditUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
                        placeholder="e.g. abdul"
                        className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-slate-100 font-bold focus:outline-none focus:ring-2 focus:ring-blue-500"
                        required
                      />
                    </div>

                    <div className="md:col-span-2">
                      <div className="flex items-center justify-between mb-1">
                        <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                          Institution / Campus
                        </label>
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-slate-500 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-md border border-slate-200 dark:border-slate-700">
                          <Lock className="w-2.5 h-2.5 text-slate-500" />
                          Fixed & Verified
                        </span>
                      </div>
                      <input
                        type="text"
                        value={editInstitution}
                        readOnly
                        disabled
                        className="w-full p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700 text-xs text-slate-600 dark:text-slate-300 font-bold cursor-not-allowed select-none opacity-85"
                      />
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                          Faculty / School
                        </label>
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-slate-500 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-md border border-slate-200 dark:border-slate-700">
                          <Lock className="w-2.5 h-2.5 text-slate-500" />
                          Fixed
                        </span>
                      </div>
                      <input
                        type="text"
                        value={editFaculty}
                        readOnly
                        disabled
                        className="w-full p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700 text-xs text-slate-600 dark:text-slate-300 font-bold cursor-not-allowed select-none opacity-85"
                      />
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                          Department / Major
                        </label>
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-slate-500 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-md border border-slate-200 dark:border-slate-700">
                          <Lock className="w-2.5 h-2.5 text-slate-500" />
                          Fixed
                        </span>
                      </div>
                      <input
                        type="text"
                        value={editDepartment}
                        readOnly
                        disabled
                        className="w-full p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700 text-xs text-slate-600 dark:text-slate-300 font-bold cursor-not-allowed select-none opacity-85"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                        Academic Level
                      </label>
                      <select
                        value={editLevel}
                        onChange={e => setEditLevel(e.target.value)}
                        className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-slate-100 font-bold focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        {STANDARD_ACADEMIC_LEVELS.map(lvl => (
                          <option key={lvl} value={lvl}>{lvl}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                        Scholar Bio
                      </label>
                      <input
                        type="text"
                        value={editBio}
                        onChange={e => setEditBio(e.target.value)}
                        placeholder="Passionate scholar competing in university leagues..."
                        className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-slate-100 font-bold focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200 dark:border-slate-800">
                    <button
                      type="button"
                      onClick={() => setIsEditingProfile(false)}
                      className="px-4 py-2 text-xs font-bold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={isSavingProfile}
                      className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-black text-xs rounded-xl shadow-md transition-all cursor-pointer flex items-center gap-2"
                    >
                      {isSavingProfile ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                      <span>{isSavingProfile ? 'Saving Changes...' : 'Save Profile Changes'}</span>
                    </button>
                  </div>
                </form>
              )}

              {/* HEAD-TO-TOE REDESIGNED: Scholar Achievements, Honours & Trophy Cabinet (100% Solid Opaque Surfaces) */}
              <div id="scholar-achievements-section" className="p-6 sm:p-8 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-6">
                {/* Section Header with Equipped Badge Spotlight */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-5 border-b border-slate-200 dark:border-slate-800">
                  <div className="flex items-center gap-3.5">
                    <div className="w-12 h-12 rounded-2xl bg-amber-100 dark:bg-amber-950 border border-amber-300 dark:border-amber-700 flex items-center justify-center text-amber-600 dark:text-amber-400 shrink-0 shadow-xs">
                      <Trophy className="w-6 h-6" />
                    </div>
                    <div>
                      <h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-white flex items-center gap-2 flex-wrap">
                        <span>Scholar Achievements, Honours & Trophy Cabinet</span>
                        {currentUser.equippedBadge && (
                          <span
                            className="px-2 py-0.5 rounded-full bg-amber-500 text-slate-950 text-xs font-black shadow-xs flex items-center justify-center"
                            title={`Equipped Badge: ${typeof currentUser.equippedBadge === 'object' ? (currentUser.equippedBadge as any).name || 'Honour' : currentUser.equippedBadge}`}
                          >
                            <span>{typeof currentUser.equippedBadge === 'object' ? (currentUser.equippedBadge as any).icon || '🏆' : '🏆'}</span>
                          </span>
                        )}
                      </h3>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                        Authoritative track record of academic milestones, Daily GP Grab ranks, and campus honours.
                      </p>
                    </div>
                  </div>
                </div>

                {/* 4 Academic Milestones Bento Cards (100% Solid Surfaces) */}
                {(() => {
                  const rawGp = typeof currentUser.gpBalance === 'number' ? currentUser.gpBalance : Number(currentUser.gpBalance || 0);
                  const progressToMinWithdraw = Math.min(100, Math.round((rawGp / effectiveMinGp) * 100));

                  return (
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      {/* Milestone 1: GP Treasury & Cash Out Qualification */}
                      <div className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex flex-col justify-between space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] font-extrabold text-blue-600 dark:text-blue-400 uppercase tracking-wider flex items-center gap-1">
                            <Coins className="w-3.5 h-3.5" />
                            GP Milestone
                          </span>
                          <span className={`px-2 py-0.5 rounded-md text-[10px] font-black ${
                            rawGp >= effectiveMinGp
                              ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-200 border border-emerald-300 dark:border-emerald-700'
                              : 'bg-blue-100 dark:bg-blue-950 text-blue-800 dark:text-blue-200 border border-blue-200 dark:border-blue-800'
                          }`}>
                            {progressToMinWithdraw}% of Target
                          </span>
                        </div>
                        <div>
                          <div className="text-lg font-black text-slate-900 dark:text-white">
                            {rawGp.toLocaleString()} GP
                          </div>
                          <div className="text-xs text-slate-500 dark:text-slate-400 font-semibold mt-0.5">
                            Target: {effectiveMinGp.toLocaleString()} GP Min Cash Out
                          </div>
                        </div>
                        <div>
                          <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2 overflow-hidden">
                            <div
                              className="bg-blue-600 h-2 rounded-full transition-all duration-500"
                              style={{ width: `${progressToMinWithdraw}%` }}
                            />
                          </div>
                          <div className="text-[10px] text-slate-500 dark:text-slate-400 mt-1 flex justify-between font-medium">
                            <span>0 GP</span>
                            <span>{rawGp >= effectiveMinGp ? '✅ Qualified' : `${(effectiveMinGp - rawGp).toLocaleString()} GP left`}</span>
                          </div>
                        </div>
                      </div>

                      {/* Milestone 3: Verified Scholar Standing */}
                      <div className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex flex-col justify-between space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] font-extrabold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider flex items-center gap-1">
                            <ShieldCheck className="w-3.5 h-3.5" />
                            Verification
                          </span>
                          <span className="px-2 py-0.5 rounded-md bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-200 border border-emerald-300 dark:border-emerald-700 text-[10px] font-black">
                            Active
                          </span>
                        </div>
                        <div>
                          <div className="text-lg font-black text-slate-900 dark:text-white">
                            Verified Scholar
                          </div>
                          <div className="text-xs text-slate-500 dark:text-slate-400 font-semibold mt-0.5">
                            {currentUser.level || 'Post-Grad'} • {currentUser.faculty || 'Engineering'}
                          </div>
                        </div>
                        <div className="pt-2 border-t border-slate-200 dark:border-slate-700 text-[11px] text-slate-600 dark:text-slate-300 flex items-center gap-1 font-medium">
                          <GraduationCap className="w-3.5 h-3.5 text-indigo-500" />
                          <span>Campus Ledger Synchronized</span>
                        </div>
                      </div>

                      {/* Milestone 4: Marketplace & Privileges */}
                      <div className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex flex-col justify-between space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] font-extrabold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider flex items-center gap-1">
                            <ShoppingBag className="w-3.5 h-3.5" />
                            Commerce Status
                          </span>
                          <span className="px-2 py-0.5 rounded-md bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-200 border border-emerald-300 dark:border-emerald-700 text-[10px] font-black">
                            Eligible
                          </span>
                        </div>
                        <div>
                          <div className="text-lg font-black text-slate-900 dark:text-white">
                            Instant VTU Privileges
                          </div>
                          <div className="text-xs text-slate-500 dark:text-slate-400 font-semibold mt-0.5">
                            Airtime, MTN/GLO Data & Mini Mart
                          </div>
                        </div>
                        <div className="pt-2 border-t border-slate-200 dark:border-slate-700 text-[11px] text-slate-600 dark:text-slate-300 flex items-center gap-1 font-medium">
                          <Zap className="w-3.5 h-3.5 text-amber-500" />
                          <span>Zero Processing Fee</span>
                        </div>
                      </div>
                    </div>
                  );
                })()}
              </div>

              {/* 5. TROPHY CABINET & ACADEMIC HONOURS / ACHIEVEMENTS */}
              <div className="p-5 sm:p-6 rounded-3xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-2xl bg-amber-500/10 dark:bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-500 shrink-0">
                      <Trophy className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="text-base font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                        <span>Trophy Cabinet & Honours</span>
                        <span className="text-[11px] font-black px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                          {currentUser.purchasedBadgeIds.length} Unlocked
                        </span>
                      </h4>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        Equip your academic badges to display honours on your Smart Campus Pass and community forums.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {badgeStore.map((badge) => {
                    const isEquipped = currentUser.equippedBadgeId === badge.id;
                    const isUnlocked = currentUser.purchasedBadgeIds.includes(badge.id);

                    return (
                      <div
                        key={badge.id}
                        className={`p-4 rounded-2xl border transition-all flex flex-col justify-between gap-3 ${
                          isEquipped
                            ? 'bg-amber-50/80 dark:bg-amber-950/20 border-amber-400 dark:border-amber-500/50 shadow-xs ring-1 ring-amber-400/40'
                            : isUnlocked
                            ? 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800'
                            : 'bg-slate-100/60 dark:bg-slate-950/40 border-slate-200/60 dark:border-slate-800/40 opacity-80'
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-2xl shrink-0 shadow-inner">
                            {badge.image}
                          </div>
                          <div className="flex-1 min-w-0">
                            {isEquipped && (
                              <div className="mb-1">
                                <span className="px-1.5 py-0.5 rounded text-[9px] font-black uppercase tracking-wider bg-amber-500 text-slate-950">
                                  Equipped
                                </span>
                              </div>
                            )}
                            <h5 className="font-extrabold text-xs text-slate-900 dark:text-white truncate mb-0.5">
                              {badge.name}
                            </h5>
                            <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-2">
                              {badge.description}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-100 dark:border-slate-800/80">
                          <span className="text-[11px] font-bold text-amber-600 dark:text-amber-400">
                            {isUnlocked ? 'Unlocked' : `${badge.gpPrice} GP`}
                          </span>

                          {isEquipped ? (
                            <button
                              type="button"
                              onClick={() => equipBadge('')}
                              className="px-3 py-1 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white bg-slate-200/70 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 transition cursor-pointer"
                            >
                              Unequip
                            </button>
                          ) : isUnlocked ? (
                            <button
                              type="button"
                              onClick={() => equipBadge(badge.id)}
                              className="px-3 py-1 rounded-xl text-xs font-black text-slate-950 bg-amber-400 hover:bg-amber-300 transition shadow-xs cursor-pointer active:scale-95"
                            >
                              Equip Honour
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => setSelectedBadgeForPurchase(badge)}
                              className="px-3 py-1 rounded-xl text-xs font-black text-slate-950 bg-gradient-to-r from-amber-400 to-yellow-400 hover:from-amber-300 hover:to-yellow-300 transition shadow-xs cursor-pointer active:scale-95 flex items-center gap-1"
                            >
                              <span>Unlock</span>
                              <Sparkles className="w-3 h-3 text-amber-900" />
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* TAB: AIRTIME & MOBILE DATA PURCHASE */}
          {activeTab === 'airtime_data' && (
            <div className="space-y-6">
              <AirtimeDataPurchaseModal />
            </div>
          )}

          {/* TAB 2: SETTINGS & SECURITY */}
          {activeTab === 'privacy' && (
            <div className="space-y-6">
              {/* Settings Sub-Navigation Filters */}
              <div className="flex items-center gap-1.5 p-1.5 bg-slate-100 dark:bg-slate-950/80 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-x-auto no-scrollbar">
                {[
                  { id: 'all', label: 'All Settings', icon: Sliders },
                  { id: 'password', label: 'Password & Auth', icon: KeyRound },
                  { id: 'privacy', label: 'Academic Privacy', icon: Lock },
                  { id: 'notifications', label: 'Notifications', icon: Bell },
                  { id: 'appearance', label: 'Appearance', icon: Sun },
                  { id: 'account', label: 'Account Session', icon: ShieldCheck },
                ].map(filter => {
                  const FilterIcon = filter.icon;
                  const isCurrent = settingsSection === filter.id;
                  return (
                    <button
                      key={filter.id}
                      type="button"
                      onClick={() => setSettingsSection(filter.id as any)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
                        isCurrent
                          ? 'bg-white dark:bg-slate-900 text-blue-900 dark:text-blue-400 shadow-sm border border-slate-200 dark:border-slate-800'
                          : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
                      }`}
                    >
                      <FilterIcon className="w-3.5 h-3.5" />
                      <span>{filter.label}</span>
                    </button>
                  );
                })}
              </div>

              {/* 1. PASSWORD & ACCOUNT AUTHENTICATION SECURITY */}
              {(settingsSection === 'all' || settingsSection === 'password') && (
                <div className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                      <h3 className="text-sm font-black text-slate-900 dark:text-slate-100 flex items-center gap-2">
                        <KeyRound className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                        <span>Password & Account Security</span>
                      </h3>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                        Manage your login password, security credentials, and email recovery settings.
                      </p>
                    </div>

                    {/* Email Verification Status Badge */}
                    {auth.currentUser && (
                      <div className="flex items-center gap-2">
                        {auth.currentUser.emailVerified ? (
                          <span className="px-2.5 py-1 rounded-full text-[11px] font-black bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 flex items-center gap-1">
                            <MailCheck className="w-3.5 h-3.5" />
                            Email Verified
                          </span>
                        ) : (
                          <div className="flex items-center gap-1.5">
                            <span className="px-2.5 py-1 rounded-full text-[11px] font-black bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 flex items-center gap-1">
                              <ShieldAlert className="w-3.5 h-3.5" />
                              Unverified Email
                            </span>
                            <button
                              type="button"
                              onClick={handleSendEmailVerification}
                              disabled={isSendingVerificationEmail}
                              className="text-[11px] font-bold text-blue-900 dark:text-blue-400 underline hover:text-blue-800 disabled:opacity-50 cursor-pointer"
                            >
                              {isSendingVerificationEmail ? 'Sending...' : 'Verify Now'}
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Verification Email Message Banners */}
                  {verificationEmailSuccess && (
                    <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-xs text-emerald-700 dark:text-emerald-300 font-semibold flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-500" />
                      <span>{verificationEmailSuccess}</span>
                    </div>
                  )}
                  {verificationEmailError && (
                    <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-xs text-rose-700 dark:text-rose-300 font-semibold flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
                      <span>{verificationEmailError}</span>
                    </div>
                  )}

                  {/* Password Feedback Banners */}
                  {passwordSuccessMessage && (
                    <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-xs text-emerald-700 dark:text-emerald-300 font-bold flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-500" />
                      <span>{passwordSuccessMessage}</span>
                    </div>
                  )}
                  {passwordErrorMessage && (
                    <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-xs text-rose-700 dark:text-rose-300 font-bold flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
                      <span>{passwordErrorMessage}</span>
                    </div>
                  )}

                  {/* Password Update Form */}
                  <form onSubmit={handleUpdatePassword} className="space-y-3 pt-1">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      {/* Current Password Field */}
                      <div>
                        <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">
                          Current Password
                        </label>
                        <div className="relative">
                          <input
                            type={showCurrentPassword ? 'text' : 'password'}
                            value={currentPassword}
                            onChange={e => setCurrentPassword(e.target.value)}
                            placeholder="Enter current password"
                            className="w-full p-2.5 pr-9 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs text-slate-900 dark:text-slate-100 font-medium focus:ring-2 focus:ring-blue-500/20 focus:border-blue-900"
                          />
                          <button
                            type="button"
                            onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                          >
                            {showCurrentPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                          </button>
                        </div>
                      </div>

                      {/* New Password Field */}
                      <div>
                        <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">
                          New Password
                        </label>
                        <div className="relative">
                          <input
                            type={showNewPassword ? 'text' : 'password'}
                            value={newPassword}
                            onChange={e => setNewPassword(e.target.value)}
                            placeholder="At least 6 characters"
                            className="w-full p-2.5 pr-9 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs text-slate-900 dark:text-slate-100 font-medium focus:ring-2 focus:ring-blue-500/20 focus:border-blue-900"
                          />
                          <button
                            type="button"
                            onClick={() => setShowNewPassword(!showNewPassword)}
                            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                          >
                            {showNewPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                          </button>
                        </div>
                      </div>

                      {/* Confirm New Password Field */}
                      <div>
                        <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">
                          Confirm New Password
                        </label>
                        <div className="relative">
                          <input
                            type={showConfirmPassword ? 'text' : 'password'}
                            value={confirmNewPassword}
                            onChange={e => setConfirmNewPassword(e.target.value)}
                            placeholder="Re-enter new password"
                            className="w-full p-2.5 pr-9 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs text-slate-900 dark:text-slate-100 font-medium focus:ring-2 focus:ring-blue-500/20 focus:border-blue-900"
                          />
                          <button
                            type="button"
                            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                          >
                            {showConfirmPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Password Strength Indicator */}
                    {newPassword && (
                      <div className="space-y-1 pt-1">
                        <div className="flex items-center justify-between text-[11px] font-bold">
                          <span className="text-slate-500 dark:text-slate-400">Password Strength:</span>
                          <span
                            className={
                              newPassword.length >= 8 && /[0-9]/.test(newPassword) && /[^A-Za-z0-9]/.test(newPassword)
                                ? 'text-emerald-500'
                                : newPassword.length >= 6
                                ? 'text-amber-500'
                                : 'text-rose-500'
                            }
                          >
                            {newPassword.length >= 8 && /[0-9]/.test(newPassword) && /[^A-Za-z0-9]/.test(newPassword)
                              ? 'Strong'
                              : newPassword.length >= 6
                              ? 'Moderate'
                              : 'Weak (Min 6 chars)'}
                          </span>
                        </div>
                        <div className="w-full h-1.5 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
                          <div
                            className={`h-full transition-all ${
                              newPassword.length >= 8 && /[0-9]/.test(newPassword) && /[^A-Za-z0-9]/.test(newPassword)
                                ? 'w-full bg-emerald-500'
                                : newPassword.length >= 6
                                ? 'w-2/3 bg-amber-500'
                                : 'w-1/3 bg-rose-500'
                            }`}
                          />
                        </div>
                      </div>
                    )}

                    <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                      <button
                        type="submit"
                        disabled={isUpdatingPassword || !newPassword || !confirmNewPassword}
                        className="px-4 py-2 bg-blue-900 hover:bg-blue-800 disabled:opacity-50 text-white text-xs font-bold rounded-xl shadow-sm transition-all flex items-center gap-2 cursor-pointer"
                      >
                        {isUpdatingPassword ? (
                          <>
                            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                            <span>Updating Password...</span>
                          </>
                        ) : (
                          <>
                            <Key className="w-3.5 h-3.5" />
                            <span>Update Password</span>
                          </>
                        )}
                      </button>

                      {/* Password Reset via Email Flow */}
                      <button
                        type="button"
                        onClick={handleSendResetPasswordEmail}
                        disabled={isSendingResetEmail}
                        className="text-xs text-blue-900 dark:text-blue-400 font-bold hover:underline flex items-center gap-1 disabled:opacity-50 cursor-pointer"
                      >
                        {isSendingResetEmail ? (
                          <>
                            <RefreshCw className="w-3 h-3 animate-spin" />
                            <span>Sending Email...</span>
                          </>
                        ) : (
                          <>
                            <span>Forgot Password? Send Reset Email</span>
                          </>
                        )}
                      </button>
                    </div>
                  </form>

                  {/* Reset Email Confirmation Toast / Notice */}
                  {resetEmailSuccessMessage && (
                    <div className="p-3 bg-blue-500/10 border border-blue-500/30 rounded-xl text-xs text-blue-900 dark:text-blue-300 font-semibold flex items-center gap-2">
                      <Info className="w-4 h-4 shrink-0 text-blue-500" />
                      <span>{resetEmailSuccessMessage}</span>
                    </div>
                  )}
                  {resetEmailErrorMessage && (
                    <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-xs text-rose-700 dark:text-rose-300 font-semibold flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
                      <span>{resetEmailErrorMessage}</span>
                    </div>
                  )}
                </div>
              )}

              {/* 2. ACADEMIC PRIVACY & IDENTITY VISIBILITY */}
              {(settingsSection === 'all' || settingsSection === 'privacy') && (
                <div className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 space-y-4">
                  <div>
                    <h3 className="text-sm font-black text-slate-900 dark:text-slate-100 flex items-center gap-2">
                      <Lock className="w-4 h-4 text-blue-500" />
                      <span>Academic Privacy & Identity Visibility</span>
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      Control how other scholars see your academic credentials across public community threads and leaderboards.
                    </p>
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center justify-between p-3.5 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800">
                      <div>
                        <div className="text-xs font-bold text-slate-800 dark:text-slate-200">
                          Display academic badge on community posts
                        </div>
                        <div className="text-[11px] text-slate-500 dark:text-slate-400">
                          When enabled, your verified institution, department, and level badge will accompany your forum replies.
                        </div>
                      </div>
                      <input
                        type="checkbox"
                        checked={currentUser.privacy?.showAcademicInfoOnPosts !== false}
                        onChange={e =>
                          updatePrivacy({ showAcademicInfoOnPosts: e.target.checked })
                        }
                        className="w-4 h-4 text-blue-900 dark:text-blue-400 rounded focus:ring-blue-900 cursor-pointer"
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                      <div>
                        <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">
                          Institution Visibility
                        </label>
                        <select
                          value={currentUser.privacy?.institutionVisibility || 'Public'}
                          onChange={e =>
                            updatePrivacy({
                              institutionVisibility: e.target.value as any,
                            })
                          }
                          className="w-full p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs text-slate-900 dark:text-slate-100 font-bold"
                        >
                          <option value="Public">Public (Everyone)</option>
                          <option value="Followers">Followers Only</option>
                          <option value="Private">Private (Hidden)</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">
                          Faculty / School
                        </label>
                        <select
                          value={currentUser.privacy?.facultyVisibility || 'Public'}
                          onChange={e =>
                            updatePrivacy({
                              facultyVisibility: e.target.value as any,
                            })
                          }
                          className="w-full p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs text-slate-900 dark:text-slate-100 font-bold"
                        >
                          <option value="Public">Public (Everyone)</option>
                          <option value="Followers">Followers Only</option>
                          <option value="Private">Private (Hidden)</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">
                          Department Visibility
                        </label>
                        <select
                          value={currentUser.privacy?.departmentVisibility || 'Public'}
                          onChange={e =>
                            updatePrivacy({
                              departmentVisibility: e.target.value as any,
                            })
                          }
                          className="w-full p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs text-slate-900 dark:text-slate-100 font-bold"
                        >
                          <option value="Public">Public (Everyone)</option>
                          <option value="Followers">Followers Only</option>
                          <option value="Private">Private (Hidden)</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">
                          Academic Level Visibility
                        </label>
                        <select
                          value={currentUser.privacy?.levelVisibility || 'Public'}
                          onChange={e =>
                            updatePrivacy({
                              levelVisibility: e.target.value as any,
                            })
                          }
                          className="w-full p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs text-slate-900 dark:text-slate-100 font-bold"
                        >
                          <option value="Public">Public (Everyone)</option>
                          <option value="Followers">Followers Only</option>
                          <option value="Private">Private (Hidden)</option>
                        </select>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* 3. NOTIFICATION PREFERENCES */}
              {(settingsSection === 'all' || settingsSection === 'notifications') && (
                <div className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 space-y-3">
                  <h3 className="text-sm font-black text-slate-900 dark:text-slate-100 flex items-center gap-2">
                    <Bell className="w-4 h-4 text-blue-500" />
                    <span>Notification & Match Alert Preferences</span>
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Select which real-time notifications and announcements should be dispatched to your account.
                  </p>

                  <div className="space-y-2 pt-1">
                    {[
                      { key: 'enablePush', label: 'Push Notifications', desc: 'Receive real-time push alerts on your current browser device' },
                      { key: 'matchAlerts', label: 'Arena & Match Alerts', desc: 'Alerts when scheduled head-to-head arena battles begin' },
                      { key: 'gusAlerts', label: 'GUS Tournament Notifications', desc: 'Round kickoff and qualification announcements' },
                      { key: 'walletAlerts', label: 'Wallet & GP Transactions', desc: 'GP winnings, conversion updates, and withdrawal confirmations' },
                      { key: 'communityMentions', label: 'Community Mentions & Comments', desc: 'Notifications when scholars reply to your posts' },
                      { key: 'adminBroadcasts', label: 'Official Super Admin Broadcasts', desc: 'Platform security advisories and nationwide tournament memos' },
                    ].map((item) => (
                      <div
                        key={item.key}
                        className="flex items-center justify-between p-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 text-xs"
                      >
                        <div>
                          <div className="font-bold text-slate-800 dark:text-slate-200">{item.label}</div>
                          <div className="text-[11px] text-slate-500 dark:text-slate-400">{item.desc}</div>
                        </div>
                        <input
                          type="checkbox"
                          checked={currentUser.notificationPreferences ? (currentUser.notificationPreferences as any)[item.key] !== false : true}
                          onChange={(e) => {
                            const updatedPrefs = {
                              enablePush: true,
                              matchAlerts: true,
                              gusAlerts: true,
                              walletAlerts: true,
                              communityMentions: true,
                              adminBroadcasts: true,
                              ...(currentUser.notificationPreferences || {}),
                              [item.key]: e.target.checked,
                            };
                            updateUserProfile({ notificationPreferences: updatedPrefs });
                          }}
                          className="w-4 h-4 text-blue-900 dark:text-blue-400 rounded focus:ring-blue-900 cursor-pointer"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* 4. THEME & APPEARANCE */}
              {(settingsSection === 'all' || settingsSection === 'appearance') && (
                <div className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 space-y-3">
                  <h3 className="text-sm font-black text-slate-900 dark:text-slate-100 flex items-center gap-2">
                    <Sun className="w-4 h-4 text-amber-500" />
                    <span>Appearance & Application Theme</span>
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Select your preferred interface display mode. Saved automatically to your profile preferences.
                  </p>

                  <div className="grid grid-cols-3 gap-3 pt-1">
                    <button
                      type="button"
                      onClick={() => setTheme('light')}
                      className={`p-3 rounded-2xl border text-xs font-bold transition-all flex flex-col items-center gap-2 cursor-pointer ${
                        theme === 'light'
                          ? 'bg-amber-500/10 border-amber-500 text-amber-600 dark:text-amber-400 ring-2 ring-amber-500/20'
                          : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:border-slate-300'
                      }`}
                    >
                      <Sun className="w-5 h-5 text-amber-500" />
                      <span>Light Mode</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setTheme('dark')}
                      className={`p-3 rounded-2xl border text-xs font-bold transition-all flex flex-col items-center gap-2 cursor-pointer ${
                        theme === 'dark'
                          ? 'bg-blue-500/10 border-blue-700 text-blue-900 dark:text-blue-400 ring-2 ring-blue-500/20'
                          : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:border-slate-300'
                      }`}
                    >
                      <Moon className="w-5 h-5 text-cyan-400" />
                      <span>Dark Mode</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setTheme('system')}
                      className={`p-3 rounded-2xl border text-xs font-bold transition-all flex flex-col items-center gap-2 cursor-pointer ${
                        theme === 'system'
                          ? 'bg-blue-500/10 border-blue-700 text-blue-900 dark:text-blue-400 ring-2 ring-blue-500/20'
                          : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:border-slate-300'
                      }`}
                    >
                      <Laptop className="w-5 h-5 text-indigo-400" />
                      <span>System Mode</span>
                    </button>
                  </div>
                </div>
              )}

              {/* 5. ACCOUNT SESSION & AUTH SECURITY */}
              {(settingsSection === 'all' || settingsSection === 'account') && (
                <div className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 space-y-3">
                  <h3 className="text-sm font-black text-slate-900 dark:text-slate-100 flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-blue-500" />
                    <span>Account Session & Auth Security</span>
                  </h3>
                  <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-1">
                    <div>
                      <p className="text-xs font-bold text-slate-800 dark:text-slate-200">
                        {firebaseUser ? `Signed in as ${firebaseUser.email}` : 'Demo Session Mode'}
                      </p>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400">
                        {firebaseUser
                          ? 'Firebase Authentication active with real-time profile persistence.'
                          : 'Sign in with your verified credentials to synchronize competition records.'}
                      </p>
                    </div>

                    <div className="flex gap-2 shrink-0">
                      {firebaseUser ? (
                        <button
                          type="button"
                          onClick={logout}
                          className="px-4 py-2 bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 border border-rose-500/30 text-xs font-bold rounded-xl transition-all cursor-pointer"
                        >
                          Sign Out
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => {
                            setIsWalletModalOpen(false);
                            openAuthModal('LOGIN');
                          }}
                          className="px-4 py-2 bg-blue-900 hover:bg-blue-800 text-white font-black text-xs rounded-xl shadow-md transition-all cursor-pointer"
                        >
                          Sign In / Register
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* 6. DANGER ZONE: ACCOUNT DELETION */}
              {(settingsSection === 'all' || settingsSection === 'account') && (
                <div className="p-5 rounded-2xl bg-rose-500/5 border border-rose-500/20 space-y-3">
                  <h3 className="text-sm font-black text-rose-600 dark:text-rose-400 flex items-center gap-2">
                    <Trash2 className="w-4 h-4 text-rose-500" />
                    <span>Danger Zone: Account Deletion</span>
                  </h3>
                  <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Permanently delete your scholar account, academic identity, GP wallet balance, and forum activity from the database.
                    </p>
                    <button
                      type="button"
                      onClick={() => setShowDeleteAccountModal(true)}
                      className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl shadow-sm transition-all cursor-pointer shrink-0"
                    >
                      Delete Account
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 3: CASH WITHDRAWAL */}
          {activeTab === 'withdraw' && (() => {
            const isUserExpired = isSubscriptionExpired(currentUser);
            const isFreeScholar =
              isUserExpired ||
              (!isUserSubscribed &&
              (!currentUser.membershipTier || currentUser.membershipTier.toLowerCase().includes('free') || currentUser.membershipTier.toLowerCase() === 'starter scholar') &&
              (!currentUser.subscriptionTier || currentUser.subscriptionTier.toLowerCase().includes('free') || currentUser.subscriptionTier.toLowerCase() === 'starter scholar') &&
              !currentUser.isRepresentative &&
              role !== 'admin');

            return (
              <div className="space-y-6">
                {/* Free Tier Lock & Upgrade Banner */}
                {isFreeScholar && (
                  <div className="p-5 sm:p-6 rounded-2xl bg-gradient-to-r from-amber-500/10 via-amber-600/10 to-orange-500/10 border-2 border-amber-500/40 space-y-3 shadow-md">
                    <div className="flex items-start gap-3.5">
                      <div className="p-3 rounded-2xl bg-amber-500/20 text-amber-500 border border-amber-500/30 shrink-0">
                        <Lock className="w-6 h-6" />
                      </div>
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className="text-sm sm:text-base font-black text-slate-900 dark:text-white">
                            Direct Bank Cash Out is Locked for Free Scholars
                          </h4>
                          <span className="px-2 py-0.5 rounded-md bg-amber-500/20 text-amber-600 dark:text-amber-400 text-[10px] font-black uppercase tracking-wider">
                            Upgrade Required
                          </span>
                        </div>
                        <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed max-w-2xl">
                          Free Scholar tier members can earn GP in competitions and redeem their GP balance for <strong>Instant Airtime & Data VTU Recharges</strong>. Direct bank account withdrawals are exclusively reserved for upgraded scholar tiers (Scholar Starter, Champions Pro, or Grobaax Titan VIP).
                        </p>
                      </div>
                    </div>

                    <div className="pt-2 flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                      <button
                        type="button"
                        onClick={() => setActiveTab('upgrade')}
                        className="px-5 py-2.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-slate-950 font-black text-xs rounded-xl shadow-md transition-all cursor-pointer flex items-center justify-center gap-2"
                      >
                        <Crown className="w-4 h-4 text-slate-950" />
                        <span>Upgrade Tier to Unlock Bank Cash Out</span>
                        <ChevronRight className="w-3.5 h-3.5" />
                      </button>

                      <button
                        type="button"
                        onClick={() => setActiveTab('airtime_data')}
                        className="px-4 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-emerald-500 text-slate-700 dark:text-slate-200 font-bold text-xs rounded-xl transition-all cursor-pointer flex items-center justify-center gap-2"
                      >
                        <Smartphone className="w-4 h-4 text-emerald-500" />
                        <span>Redeem GP for Airtime & Data (Available Now)</span>
                      </button>
                    </div>
                  </div>
                )}

                <div className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 space-y-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="font-black text-slate-900 dark:text-slate-100 text-base flex items-center gap-2">
                        <Banknote className="w-5 h-5 text-blue-500" />
                        <span>Cash Out GP Balance</span>
                      </h3>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                        Your available balance is <strong className="text-blue-500 font-extrabold">{authoritativeGpBalance} GP</strong>. Withdraw your earned competition GP directly to your registered bank account.
                      </p>
                    </div>

                    {isFreeScholar ? (
                      <span className="px-2.5 py-1 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-500 text-[11px] font-black uppercase tracking-wider flex items-center gap-1">
                        <Lock className="w-3.5 h-3.5" />
                        Free Tier (Disabled)
                      </span>
                    ) : (
                      <span className="px-2.5 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-[11px] font-black uppercase tracking-wider flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        Eligible Scholar
                      </span>
                    )}
                  </div>

                  {withdrawalMessage && (
                    <div
                      className={`p-3.5 rounded-xl text-xs font-bold border flex items-center gap-2 ${
                        withdrawalMessage.type === 'success'
                          ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/30'
                          : 'bg-rose-500/10 text-rose-500 border-rose-500/30'
                      }`}
                    >
                      {withdrawalMessage.type === 'success' ? (
                        <Check className="w-4 h-4 shrink-0" />
                      ) : (
                        <AlertCircle className="w-4 h-4 shrink-0" />
                      )}
                      <span>{withdrawalMessage.text}</span>
                    </div>
                  )}

                  {/* Quick Presets */}
                  <div className={isFreeScholar ? 'opacity-50 pointer-events-none' : ''}>
                    <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
                      Quick Preset GP Amounts:
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {[
                        { gp: effectiveMinGp, label: `${effectiveMinGp.toLocaleString()} GP (Min)` },
                        ...(effectiveMinGp < 5000 ? [{ gp: 5000, label: '5,000 GP' }] : []),
                        ...(effectiveMinGp < 10000 ? [{ gp: 10000, label: '10,000 GP' }] : []),
                        { gp: Math.max(15000, effectiveMinGp * 2), label: `${Math.max(15000, effectiveMinGp * 2).toLocaleString()} GP` },
                        ...(currentUser.gpBalance && currentUser.gpBalance >= effectiveMinGp
                          ? [{ gp: currentUser.gpBalance, label: `Max (${currentUser.gpBalance.toLocaleString()} GP)` }]
                          : []),
                      ].map((preset, idx) => (
                        <button
                          key={idx}
                          type="button"
                          disabled={isFreeScholar}
                          onClick={() => setWithdrawGpAmount(preset.gp)}
                          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer border ${
                            withdrawGpAmount === preset.gp
                              ? 'bg-blue-600 text-white border-blue-500 shadow-sm'
                              : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-800 hover:border-blue-500'
                          }`}
                        >
                          {preset.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <form onSubmit={handleWithdraw} className="space-y-4 max-w-lg">
                    <div className={isFreeScholar ? 'opacity-50' : ''}>
                      <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                        GP Amount to Cash Out
                      </label>
                      <input
                        type="number"
                        disabled={isFreeScholar}
                        min={effectiveMinGp}
                        max={gpConversionConfig.maximumWithdrawalGP || 500000}
                        value={withdrawGpAmount}
                        onChange={e => setWithdrawGpAmount(Number(e.target.value))}
                        className="w-full p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-sm text-slate-900 dark:text-slate-100 font-bold focus:outline-none focus:ring-2 focus:ring-blue-900 disabled:bg-slate-100 dark:disabled:bg-slate-800/50 disabled:cursor-not-allowed"
                        required
                      />
                      <div className="mt-1 flex justify-between text-xs text-slate-500">
                        <span>Available: <strong className="text-blue-500">{authoritativeGpBalance} GP</strong></span>
                        <span>Min: <strong className="text-amber-500">{effectiveMinGp.toLocaleString()} GP</strong></span>
                      </div>
                    </div>

                    <div className={`grid grid-cols-1 sm:grid-cols-2 gap-3 ${isFreeScholar ? 'opacity-50' : ''}`}>
                      <div>
                        <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                          Bank Name
                        </label>
                        <input
                          type="text"
                          disabled={isFreeScholar}
                          placeholder="e.g. FirstBank, GTBank, Zenith, Access, Kuda"
                          value={bankName}
                          onChange={e => setBankName(e.target.value)}
                          className="w-full p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs text-slate-900 dark:text-slate-100 disabled:bg-slate-100 dark:disabled:bg-slate-800/50 disabled:cursor-not-allowed"
                          required={!isFreeScholar}
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                          10-Digit Account Number
                        </label>
                        <input
                          type="text"
                          disabled={isFreeScholar}
                          maxLength={10}
                          placeholder="0123456789"
                          value={accountNumber}
                          onChange={e => setAccountNumber(e.target.value.replace(/\D/g, ''))}
                          className="w-full p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs text-slate-900 dark:text-slate-100 disabled:bg-slate-100 dark:disabled:bg-slate-800/50 disabled:cursor-not-allowed"
                          required={!isFreeScholar}
                        />
                      </div>
                    </div>

                    {isFreeScholar ? (
                      <button
                        type="button"
                        onClick={() => setActiveTab('upgrade')}
                        className="w-full py-3.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-slate-950 font-black text-xs rounded-xl shadow-md cursor-pointer transition-all flex items-center justify-center gap-2"
                      >
                        <Crown className="w-4 h-4 text-slate-950" />
                        <span>🔒 Cash Out Disabled for Free Scholars — Click to Upgrade Tier</span>
                      </button>
                    ) : (
                      <button
                        type="submit"
                        className="w-full py-3 bg-gradient-to-r from-blue-700 to-indigo-700 hover:from-blue-600 hover:to-indigo-600 text-white font-black text-xs rounded-xl shadow-lg shadow-blue-950/20 cursor-pointer transition-all flex items-center justify-center gap-2"
                      >
                        <Banknote className="w-4 h-4" />
                        <span>Submit Cash Out Request ({withdrawGpAmount.toLocaleString()} GP)</span>
                      </button>
                    )}
                  </form>
                </div>

                {/* Withdrawal History */}
                <div className="space-y-3">
                  <h4 className="text-xs font-black text-slate-900 dark:text-slate-100 uppercase tracking-wider">
                    Past Withdrawal History ({withdrawals.length})
                  </h4>

                  <div className="space-y-2">
                    {withdrawals.length === 0 ? (
                      <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-center text-xs text-slate-400">
                        No withdrawal requests yet.
                      </div>
                    ) : (
                      withdrawals.map(w => (
                        <div
                          key={w.id}
                          className="p-3.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs"
                        >
                          <div>
                            <div className="font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                              <span>{w.amountGP.toLocaleString()} GP</span>
                            </div>
                            <div className="text-slate-400 text-[11px] mt-0.5">
                              {w.bankName} • {w.accountNumber} • {w.requestDate}
                            </div>
                          </div>

                          <span
                            className={`px-2.5 py-1 font-bold text-[10px] rounded-md border ${
                              w.status === 'Paid' || w.status === 'Approved'
                                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                                : w.status === 'Pending'
                                ? 'bg-amber-500/10 text-amber-600 border-amber-500/30'
                                : 'bg-rose-500/10 text-rose-600 border-rose-500/30'
                            }`}
                          >
                            {w.status}
                          </span>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            );
          })()}

          {/* TAB 4: TRANSACTIONS HISTORY */}
          {activeTab === 'history' && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200 dark:border-slate-800 pb-3">
                <div>
                  <h3 className="font-black text-slate-900 dark:text-slate-100 text-sm uppercase tracking-wider flex items-center gap-2">
                    <History className="w-4 h-4 text-blue-500" />
                    <span>Personal Transaction Ledger</span>
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    Authoritative real-time record of all your GP additions (quizzes, rewards, refunds) and deductions (VTU airtime/data, badges, withdrawals, subscriptions).
                  </p>
                </div>
                <div className="text-xs text-slate-500 dark:text-slate-400 font-semibold bg-slate-100 dark:bg-slate-800 px-3 py-1.5 rounded-xl self-start sm:self-auto">
                  {transactions.filter(t => !t.userId || t.userId === currentUser.id || t.userId === firebaseUser?.uid || (t.userEmail && t.userEmail === currentUser.email)).length} Recorded Transactions
                </div>
              </div>

              {(() => {
                const userTxs = transactions.filter(
                  t => !t.userId || t.userId === currentUser.id || t.userId === firebaseUser?.uid || (t.userEmail && t.userEmail === currentUser.email)
                );

                const totalUserCredits = userTxs
                  .filter(t => t.isCredit)
                  .reduce((acc, t) => acc + (Number(t.amount) || 0), 0);
                const totalUserDebits = userTxs
                  .filter(t => !t.isCredit)
                  .reduce((acc, t) => acc + (Number(t.amount) || 0), 0);

                const filteredUserTxs = userTxs.filter(tx => {
                  if (ledgerSearchTerm.trim()) {
                    const q = ledgerSearchTerm.toLowerCase();
                    const match =
                      (tx.title && tx.title.toLowerCase().includes(q)) ||
                      (tx.description && tx.description.toLowerCase().includes(q)) ||
                      (tx.transactionId && tx.transactionId.toLowerCase().includes(q)) ||
                      (tx.id && tx.id.toLowerCase().includes(q)) ||
                      (tx.reason && tx.reason.toLowerCase().includes(q)) ||
                      (tx.type && tx.type.toLowerCase().includes(q));
                    if (!match) return false;
                  }

                  if (ledgerDirectionFilter === 'credit' && !tx.isCredit) return false;
                  if (ledgerDirectionFilter === 'debit' && tx.isCredit) return false;

                  if (ledgerTypeFilter !== 'all') {
                    if (ledgerTypeFilter === 'quiz' && tx.type !== 'gp_earned') return false;
                    if (ledgerTypeFilter === 'vtu' && tx.type !== 'vtu_purchase' && tx.type !== 'vtu_redemption') return false;
                    if (ledgerTypeFilter === 'withdrawal' && tx.type !== 'gp_withdrawal' && tx.type !== 'withdrawal') return false;
                    if (ledgerTypeFilter === 'badge' && tx.type !== 'badge_purchase') return false;
                    if (ledgerTypeFilter === 'subscription' && tx.type !== 'subscription_purchase') return false;
                    if (ledgerTypeFilter === 'reward' && tx.type !== 'reward' && tx.type !== 'grant' && tx.type !== 'GUS_PRIZE' && tx.type !== 'welcome_bonus') return false;
                    if (ledgerTypeFilter === 'admin' && tx.type !== 'admin_adjustment') return false;
                  }

                  return true;
                });

                const getLedgerTypeInfo = (type: string) => {
                  switch (type) {
                    case 'gp_earned':
                      return {
                        label: 'Speed Quiz',
                        icon: Award,
                        bg: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20',
                      };
                    case 'GUS_PRIZE':
                    case 'reward':
                    case 'grant':
                    case 'welcome_bonus':
                      return {
                        label: 'Prize & Milestone',
                        icon: Sparkles,
                        bg: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20',
                      };
                    case 'badge_purchase':
                      return {
                        label: 'Badge Store',
                        icon: ShoppingBag,
                        bg: 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20',
                      };
                    case 'gp_withdrawal':
                    case 'withdrawal':
                      return {
                        label: 'Cash Out Payout',
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
                    default:
                      return {
                        label: (type || 'TRANSACTION').replace(/_/g, ' ').toUpperCase(),
                        icon: Receipt,
                        bg: 'bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-500/20',
                      };
                  }
                };

                return (
                  <div className="space-y-4">
                    {/* User Summary Stats */}
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                      <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700">
                        <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-[11px] mb-1">
                          <span>Total Credited (+)</span>
                          <ArrowUpRight className="w-3.5 h-3.5 text-emerald-500" />
                        </div>
                        <div className="text-lg font-black text-emerald-600 dark:text-emerald-400">
                          +{totalUserCredits.toLocaleString()} <span className="text-xs font-semibold">GP</span>
                        </div>
                      </div>

                      <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700">
                        <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-[11px] mb-1">
                          <span>Total Debited (-)</span>
                          <ArrowDownRight className="w-3.5 h-3.5 text-rose-500" />
                        </div>
                        <div className="text-lg font-black text-rose-600 dark:text-rose-400">
                          -{totalUserDebits.toLocaleString()} <span className="text-xs font-semibold">GP</span>
                        </div>
                      </div>

                      <div className="col-span-2 sm:col-span-1 p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700">
                        <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-[11px] mb-1">
                          <span>Current GP Balance</span>
                          <Coins className="w-3.5 h-3.5 text-amber-500" />
                        </div>
                        <div className="text-lg font-black text-amber-600 dark:text-amber-400">
                          {(typeof currentUser.gpBalance === 'number' ? currentUser.gpBalance : Number(currentUser.gpBalance || 0)).toLocaleString()} <span className="text-xs font-semibold">GP</span>
                        </div>
                      </div>
                    </div>

                    {/* Filter & Search Bar */}
                    <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-2.5">
                      <div className="flex flex-col sm:flex-row items-center gap-2">
                        <div className="relative flex-1 w-full">
                          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                          <input
                            type="text"
                            placeholder="Search your transactions, reference ID, descriptions..."
                            value={ledgerSearchTerm}
                            onChange={(e) => setLedgerSearchTerm(e.target.value)}
                            className="w-full pl-8 pr-8 py-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
                          />
                          {ledgerSearchTerm && (
                            <button
                              onClick={() => setLedgerSearchTerm('')}
                              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>

                        {/* Direction Toggle */}
                        <div className="flex items-center gap-1 bg-white dark:bg-slate-900 p-1 rounded-lg border border-slate-200 dark:border-slate-700 shrink-0 w-full sm:w-auto justify-between sm:justify-start">
                          <button
                            onClick={() => setLedgerDirectionFilter('all')}
                            className={`px-2.5 py-1 rounded-md text-[11px] font-bold transition cursor-pointer ${
                              ledgerDirectionFilter === 'all'
                                ? 'bg-blue-600 text-white shadow-xs'
                                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                            }`}
                          >
                            All ({userTxs.length})
                          </button>
                          <button
                            onClick={() => setLedgerDirectionFilter('credit')}
                            className={`px-2.5 py-1 rounded-md text-[11px] font-bold transition flex items-center gap-1 cursor-pointer ${
                              ledgerDirectionFilter === 'credit'
                                ? 'bg-emerald-600 text-white shadow-xs'
                                : 'text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/10'
                            }`}
                          >
                            <ArrowUpRight className="w-3 h-3" />
                            Additions (+)
                          </button>
                          <button
                            onClick={() => setLedgerDirectionFilter('debit')}
                            className={`px-2.5 py-1 rounded-md text-[11px] font-bold transition flex items-center gap-1 cursor-pointer ${
                              ledgerDirectionFilter === 'debit'
                                ? 'bg-rose-600 text-white shadow-xs'
                                : 'text-rose-600 dark:text-rose-400 hover:bg-rose-500/10'
                            }`}
                          >
                            <ArrowDownRight className="w-3 h-3" />
                            Deductions (-)
                          </button>
                        </div>
                      </div>

                      {/* Category Filter */}
                      <div className="flex items-center gap-2 text-[11px]">
                        <span className="text-slate-400 font-medium">Filter Category:</span>
                        <select
                          value={ledgerTypeFilter}
                          onChange={(e) => setLedgerTypeFilter(e.target.value)}
                          className="px-2.5 py-1 rounded-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-xs focus:ring-1 focus:ring-blue-500 focus:outline-none"
                        >
                          <option value="all">All Categories</option>
                          <option value="quiz">Speed Quizzes (Earnings)</option>
                          <option value="reward">Prizes & Grants</option>
                          <option value="vtu">Airtime & Data VTU</option>
                          <option value="withdrawal">Cash Out Withdrawals</option>
                          <option value="badge">Badge Store</option>
                          <option value="subscription">Academic Upgrades</option>
                          <option value="admin">Admin Adjustments</option>
                        </select>
                        {(ledgerSearchTerm || ledgerDirectionFilter !== 'all' || ledgerTypeFilter !== 'all') && (
                          <button
                            onClick={() => {
                              setLedgerSearchTerm('');
                              setLedgerDirectionFilter('all');
                              setLedgerTypeFilter('all');
                            }}
                            className="text-blue-600 dark:text-blue-400 font-semibold hover:underline ml-auto"
                          >
                            Reset filters
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Transactions List */}
                    {filteredUserTxs.length === 0 ? (
                      <div className="p-10 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-center space-y-3">
                        <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center mx-auto text-slate-400">
                          <Receipt className="w-6 h-6" />
                        </div>
                        <h4 className="font-bold text-slate-800 dark:text-slate-200 text-sm">
                          {userTxs.length === 0 ? 'No Transactions Recorded Yet' : 'No Matching Transactions'}
                        </h4>
                        <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
                          {userTxs.length === 0
                            ? 'Your wallet has no transaction entries yet. Play Dome Speed Quizzes, purchase profile badges, or redeem airtime to see your real-time entries appear here!'
                            : 'No entries match your current search and filter settings. Click "Reset filters" to view all records.'}
                        </p>
                        {userTxs.length > 0 && (
                          <button
                            onClick={() => {
                              setLedgerSearchTerm('');
                              setLedgerDirectionFilter('all');
                              setLedgerTypeFilter('all');
                            }}
                            className="px-4 py-2 rounded-xl bg-blue-600 text-white font-bold text-xs hover:bg-blue-500 transition cursor-pointer"
                          >
                            View All Transactions
                          </button>
                        )}
                      </div>
                    ) : (
                      <div className="space-y-2.5">
                        {filteredUserTxs.map(tx => {
                          const badge = getLedgerTypeInfo(tx.type);
                          const BadgeIcon = badge.icon;

                          return (
                            <div
                              key={tx.id || tx.transactionId}
                              className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs shadow-xs hover:border-blue-500/40 transition-all"
                            >
                              <div className="space-y-1">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="font-black text-slate-900 dark:text-slate-100 text-sm">
                                    {tx.title}
                                  </span>
                                  <span
                                    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold border ${badge.bg}`}
                                  >
                                    <BadgeIcon className="w-3 h-3 shrink-0" />
                                    <span>{badge.label}</span>
                                  </span>
                                  <span
                                    className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider ${
                                      tx.status === 'completed'
                                        ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                                        : tx.status === 'pending'
                                        ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20'
                                        : 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20'
                                    }`}
                                  >
                                    {tx.status}
                                  </span>
                                </div>

                                <div className="text-slate-600 dark:text-slate-400 text-xs">
                                  {tx.description}
                                </div>

                                {tx.reason && tx.reason !== tx.description && (
                                  <div className="text-[11px] text-blue-600 dark:text-blue-400 italic">
                                    Note: {tx.reason}
                                  </div>
                                )}

                                <div className="text-slate-400 text-[10px] font-mono flex items-center gap-2 pt-0.5">
                                  <span>{tx.date || 'Recent'}</span>
                                  <span>•</span>
                                  <span className="text-slate-500 dark:text-slate-400">Ref: {tx.transactionId || tx.id}</span>
                                </div>
                              </div>

                              <div className="sm:text-right shrink-0">
                                <div
                                  className={`font-black text-base tracking-tight ${
                                    tx.isCredit
                                      ? 'text-emerald-600 dark:text-emerald-400'
                                      : 'text-rose-600 dark:text-rose-400'
                                  }`}
                                >
                                  {tx.isCredit ? '+' : '-'}{Number(tx.amount).toLocaleString()} {tx.unit || 'GP'}
                                </div>
                                <div className="text-[10px] text-slate-400 font-medium mt-0.5 flex items-center sm:justify-end gap-1">
                                  {tx.isCredit ? (
                                    <>
                                      <ArrowUpRight className="w-3 h-3 text-emerald-500" />
                                      <span>Balance Addition</span>
                                    </>
                                  ) : (
                                    <>
                                      <ArrowDownRight className="w-3 h-3 text-rose-500" />
                                      <span>Balance Deduction</span>
                                    </>
                                  )}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })()}
            </div>
          )}

          {/* TAB 5: MEMBERSHIP UPGRADE PLANS (SYNCED LIVE FROM FIRESTORE ADMIN) */}
          {activeTab === 'upgrade' && (() => {
            const isSuper =
              Boolean(currentUser.id && isPrimarySuperAdmin(currentUser.id, currentUser.email)) ||
              Boolean(currentUser.uid && isPrimarySuperAdmin(currentUser.uid, currentUser.email)) ||
              currentUser.email === 'grobaxycompany@gmail.com' ||
              currentUser.id === PRIMARY_SUPER_ADMIN_UID ||
              currentUser.uid === PRIMARY_SUPER_ADMIN_UID ||
              currentUser.role === 'admin' ||
              currentUser.role === 'super_admin';

            const isUserExpired = !isSuper && isSubscriptionExpired(currentUser);

            const activeTierName = isSuper
              ? 'Grobaax Titan Annual VIP'
              : isUserExpired
              ? 'Free Scholar'
              : (!isUserExpired && currentUser.membershipTier && !currentUser.membershipTier.toLowerCase().includes('free')
                ? currentUser.membershipTier
                : (!isUserExpired && currentUser.activePlanId
                  ? (subscriptionPlans.find(p => p.planId === currentUser.activePlanId || p.id === currentUser.activePlanId)?.name || currentUser.membershipTier || 'Free Scholar')
                  : 'Free Scholar'));

            const isFreeBase = !isSuper && (
              isUserExpired ||
              (!currentUser.activePlanId &&
                (!currentUser.membershipTier ||
                  currentUser.membershipTier.toLowerCase().trim() === 'starter scholar' ||
                  currentUser.membershipTier.toLowerCase().includes('free')))
            );

            return (
              <div className="space-y-6">
                {/* Header Banner with Active Current Tier Indicator */}
                <div className="p-6 rounded-3xl bg-transparent border border-slate-300 dark:border-slate-800 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4 text-slate-900 dark:text-white">
                  <div className="space-y-1.5">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-transparent text-slate-600 dark:text-slate-300 border border-slate-300 dark:border-slate-700/80">
                        Authoritative Tier System
                      </span>
                      <div className="flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold bg-transparent text-emerald-600 dark:text-emerald-400 border border-emerald-500/40">
                        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                        <span>Active Tier: <strong className="text-slate-900 dark:text-white">{activeTierName}</strong></span>
                      </div>
                    </div>
                    <h3 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                      Scholar Membership Tiers
                    </h3>
                    <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 max-w-2xl leading-relaxed">
                      Upgrade your Grobaax academic tier for 2x–3x GP multiplier boosts, verified profile badges, arena priority, and unlimited Minimart seller listings.
                    </p>
                  </div>

                  {currentUser.subscriptionExpiry && (
                    <div className="px-4 py-2.5 rounded-2xl bg-transparent border border-slate-300 dark:border-slate-700/80 text-right shrink-0">
                      <div className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Subscription Expiry</div>
                      <div className="text-sm font-black text-amber-500 dark:text-amber-400 mt-0.5">
                        {new Date(currentUser.subscriptionExpiry).toLocaleDateString(undefined, {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                        })}
                      </div>
                    </div>
                  )}
                </div>

                {/* Dynamic Plans Grid */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {/* Free Scholar Base Card */}
                  <div
                    className={`rounded-3xl p-6 sm:p-7 flex flex-col justify-between space-y-6 transition-all duration-200 relative bg-transparent ${
                      isFreeBase
                        ? 'border-2 border-emerald-500/70 shadow-lg shadow-emerald-500/5 ring-1 ring-emerald-500/20'
                        : 'border border-slate-300 dark:border-slate-800 hover:border-slate-400 dark:hover:border-slate-700'
                    }`}
                  >
                    {isFreeBase && (
                      <div className="absolute -top-3 right-5 px-3.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-500 text-slate-950 shadow-md flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-slate-950 animate-pulse"></span>
                        Active Current Tier
                      </div>
                    )}

                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <span className="px-3 py-1 text-[10px] font-black uppercase tracking-wider rounded-full bg-transparent text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-700/80">
                          {freeScholarPlan?.badgeLabel || 'Free Forever'}
                        </span>
                        <span className="text-[11px] font-mono text-slate-600 dark:text-slate-300 bg-transparent px-2.5 py-0.5 rounded-md border border-slate-300 dark:border-slate-700/80">
                          Lifetime
                        </span>
                      </div>

                      <div>
                        <h4 className="font-black text-xl sm:text-2xl text-slate-900 dark:text-white tracking-tight">
                          {freeScholarPlan?.name || 'Free Scholar'}
                        </h4>
                        <div className="text-3xl sm:text-4xl font-black text-slate-900 dark:text-white mt-1.5 tracking-tight flex items-baseline gap-1.5">
                          ₦0 <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">/ Lifetime</span>
                        </div>
                        <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 mt-2 leading-relaxed">
                          {freeScholarPlan?.shortDescription || 'Standard academic access to campus discussions and basic quizzes.'}
                        </p>
                      </div>

                      <div className="border-t border-slate-200 dark:border-slate-800/80 pt-4">
                        <div className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-3">
                          Standard Privileges:
                        </div>
                        <ul className="space-y-3 text-xs sm:text-sm">
                          {(freeScholarPlan?.benefits && freeScholarPlan.benefits.length > 0
                            ? freeScholarPlan.benefits
                            : [
                                'Daily GP Grab — 2 Responses',
                                'Browse Campus Minimart (Discovery Only)',
                                'Withdrawal Eligibility — Not Available',
                                'SchoolDome',
                                'Campus connect — Limited Access',
                                'Competition - Hint — Not Available',
                                'GbX Ads — Available',
                              ]
                          ).map((benefit, bIdx) => {
                            const isUnavailable =
                              benefit.toLowerCase().includes('not available') ||
                              benefit.toLowerCase().includes('locked') ||
                              benefit.toLowerCase().includes('disabled');
                            return (
                              <li key={bIdx} className="flex items-start gap-2.5">
                                {isUnavailable ? (
                                  <XCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                                ) : (
                                  <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                                )}
                                <span className={`leading-snug font-medium ${isUnavailable ? 'text-slate-400 dark:text-slate-500' : 'text-slate-800 dark:text-slate-200'}`}>
                                  {benefit}
                                </span>
                              </li>
                            );
                          })}
                        </ul>
                      </div>
                    </div>

                    <button
                      disabled
                      className={`w-full py-3.5 font-black text-xs sm:text-sm rounded-xl flex items-center justify-center gap-2 border transition ${
                        isFreeBase
                          ? 'bg-transparent text-emerald-600 dark:text-emerald-400 border-emerald-500/50 shadow-sm cursor-default'
                          : 'bg-transparent text-slate-400 dark:text-slate-500 border-slate-300 dark:border-slate-800 cursor-not-allowed'
                      }`}
                    >
                      {isFreeBase ? (
                        <>
                          <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                          <span>Active Current Tier</span>
                        </>
                      ) : (
                        'Included Standard Tier'
                      )}
                    </button>
                  </div>

                  {/* Firestore Admin Synced Paid Plans */}
                  {sortSubscriptionPlans(
                    (activeSubscriptionPlans.length > 0 ? activeSubscriptionPlans : subscriptionPlans)
                      .filter(p => p.active !== false && p.planId !== 'plan_free_scholar' && p.id !== 'plan_free_scholar' && p.priceNaira > 0)
                  ).map((plan) => {
                    const isPlanExpired = !isSuper && isSubscriptionExpired(currentUser);

                    const isCurrent = (isSuper && (plan.planId === 'plan_titan_naira' || plan.name.toLowerCase().includes('titan') || plan.name.toLowerCase().includes('vip'))) ||
                      (!isPlanExpired && Boolean(
                        (currentUser.activePlanId && (currentUser.activePlanId === plan.planId || currentUser.activePlanId === plan.id)) ||
                        (currentUser.subscription?.planId && (currentUser.subscription.planId === plan.planId || currentUser.subscription.planId === plan.id)) ||
                        ((currentUser as any).planId && ((currentUser as any).planId === plan.planId || (currentUser as any).planId === plan.id)) ||
                        (currentUser.membershipTier && currentUser.membershipTier.trim().toLowerCase() === plan.name.trim().toLowerCase()) ||
                        (currentUser.subscriptionTier && currentUser.subscriptionTier.trim().toLowerCase() === plan.name.trim().toLowerCase()) ||
                        ((currentUser as any).subscriptionPlan && (currentUser as any).subscriptionPlan.trim().toLowerCase() === plan.name.trim().toLowerCase())
                      ));

                    return (
                      <div
                        key={plan.id || plan.planId}
                        className={`rounded-3xl p-6 sm:p-7 flex flex-col justify-between space-y-6 relative transition-all duration-200 bg-transparent ${
                          isCurrent
                            ? 'border-2 border-emerald-500/70 shadow-lg shadow-emerald-500/5 ring-1 ring-emerald-500/20'
                            : plan.featured
                            ? 'border-2 border-blue-500/60 hover:border-blue-400/80 shadow-lg shadow-blue-500/5'
                            : 'border border-slate-300 dark:border-slate-800 hover:border-slate-400 dark:hover:border-slate-700'
                        }`}
                      >
                        {isCurrent ? (
                          <div className="absolute -top-3 right-5 px-3.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-500 text-slate-950 shadow-md flex items-center gap-1.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-slate-950 animate-pulse"></span>
                            Active Current Tier
                          </div>
                        ) : plan.featured ? (
                          <div className="absolute -top-3 right-5 px-3.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-blue-600 text-white shadow-md">
                            Featured Choice
                          </div>
                        ) : null}

                        <div className="space-y-4">
                          <div className="flex items-center gap-2">
                            {plan.badgeLabel && (
                              <span className="px-3 py-1 text-[10px] font-black uppercase tracking-wider rounded-full bg-transparent text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-700/80 inline-block">
                                {plan.badgeLabel}
                              </span>
                            )}
                            <span className="text-[11px] text-slate-600 dark:text-slate-300 font-mono bg-transparent px-2.5 py-0.5 rounded-md border border-slate-300 dark:border-slate-700/80">
                              {plan.durationValue} {plan.durationUnit}
                            </span>
                          </div>

                          <div>
                            <h4 className="font-black text-xl sm:text-2xl text-slate-900 dark:text-white tracking-tight">
                              {plan.name}
                            </h4>
                            <div className="text-3xl sm:text-4xl font-black text-slate-900 dark:text-white mt-1.5 tracking-tight flex items-baseline gap-1.5">
                              ₦{plan.priceNaira.toLocaleString()}{' '}
                              <span className="text-xs sm:text-sm font-semibold text-slate-500 dark:text-slate-400">
                                / {plan.durationValue} {plan.durationUnit}
                              </span>
                            </div>
                            {plan.shortDescription && (
                              <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 mt-2 leading-relaxed font-normal">
                                {plan.shortDescription}
                              </p>
                            )}
                          </div>

                          {/* Benefits list */}
                          <div className="border-t border-slate-200 dark:border-slate-800/80 pt-4">
                            <div className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-3">
                              Tier Benefits:
                            </div>
                            <ul className="space-y-3 text-xs sm:text-sm text-slate-800 dark:text-slate-200">
                              {plan.benefits.map((benefit, idx) => (
                                <li key={idx} className="flex items-start gap-2.5">
                                  <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                                  <span className="leading-snug font-medium">{benefit}</span>
                                </li>
                              ))}
                            </ul>
                          </div>

                          {/* Feature Pills */}
                          {plan.features && plan.features.length > 0 && (
                            <div className="flex flex-wrap gap-1.5 pt-2">
                              {plan.features.map((feat, idx) => (
                                <span
                                  key={idx}
                                  className="px-2.5 py-1 text-[11px] font-bold rounded-lg bg-transparent text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-700/80"
                                >
                                  {feat}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>

                        <button
                          onClick={() => {
                            setUpgradeResult(null);
                            setSelectedPlanForUpgrade(plan);
                          }}
                          disabled={isCurrent}
                          className={`w-full py-3.5 font-black text-xs sm:text-sm rounded-xl cursor-pointer transition-all flex items-center justify-center gap-2 shadow-sm active:scale-[0.98] ${
                            isCurrent
                              ? 'bg-transparent text-emerald-600 dark:text-emerald-400 border border-emerald-500/50 cursor-default'
                              : plan.featured
                              ? 'bg-blue-600 hover:bg-blue-500 text-white shadow-md shadow-blue-600/30'
                              : 'bg-slate-800 hover:bg-slate-700 text-white dark:bg-slate-800 dark:hover:bg-slate-700'
                          }`}
                        >
                          {isCurrent ? (
                            <>
                              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                              <span>Active Current Tier</span>
                            </>
                          ) : (
                            <>
                              <Sparkles className="w-4 h-4" />
                              <span>Upgrade to {plan.name}</span>
                            </>
                          )}
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })()}

          {/* TAB 7: CONTACT US & SUPPORT */}
          {activeTab === 'contact' && (
            <ContactSupportTab
              userName={currentUser.name || currentUser.fullName || 'Scholar'}
              userEmail={currentUser.email || (currentUser as any).registeredEmail}
            />
          )}
        </div>
      </div>

      {/* PLAN CHECKOUT & UPGRADE MODAL */}
      {selectedPlanForUpgrade && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-lg w-full border border-blue-500/30 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95">
            {/* Header */}
            <div className="p-6 bg-gradient-to-r from-blue-950 via-blue-900 to-slate-900 text-white flex items-start justify-between border-b border-blue-500/20">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-blue-500/30 text-blue-200 border border-blue-400/30">
                    Instant Upgrade
                  </span>
                  {selectedPlanForUpgrade.badgeLabel && (
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-400/20 text-amber-300 border border-amber-400/30">
                      {selectedPlanForUpgrade.badgeLabel}
                    </span>
                  )}
                </div>
                <h3 className="text-xl font-extrabold text-white">
                  Upgrade to {selectedPlanForUpgrade.name}
                </h3>
                <p className="text-xs text-blue-200">
                  Duration: {selectedPlanForUpgrade.durationValue} {selectedPlanForUpgrade.durationUnit}
                </p>
              </div>

              <button
                onClick={() => {
                  setSelectedPlanForUpgrade(null);
                  setUpgradeResult(null);
                }}
                className="p-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Content */}
            <div className="p-6 space-y-5 max-h-[75vh] overflow-y-auto">
              {/* Feedback Alert */}
              {upgradeResult && (
                <div
                  className={`p-4 rounded-2xl border text-xs flex items-start gap-3 ${
                    upgradeResult.success
                      ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400'
                      : 'bg-rose-500/10 border-rose-500/30 text-rose-600 dark:text-rose-400'
                  }`}
                >
                  {upgradeResult.success ? (
                    <CheckCircle2 className="w-5 h-5 shrink-0 mt-0.5" />
                  ) : (
                    <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
                  )}
                  <div className="space-y-1">
                    <p className="font-bold">{upgradeResult.success ? 'Upgrade Successful!' : 'Upgrade Failed'}</p>
                    <p>{upgradeResult.message}</p>
                  </div>
                </div>
              )}

              {/* Price Breakdown */}
              <div className="p-4 rounded-2xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/60 flex items-center justify-between">
                <div>
                  <div className="text-xs text-slate-500 dark:text-slate-400">Total Subscription Fee</div>
                  <div className="text-2xl font-black text-slate-900 dark:text-white">
                    ₦{selectedPlanForUpgrade.priceNaira.toLocaleString()}{' '}
                    <span className="text-xs font-normal text-slate-400">
                      / {selectedPlanForUpgrade.durationValue} {selectedPlanForUpgrade.durationUnit}
                    </span>
                  </div>
                </div>

                <div className="text-right text-xs">
                  <div className="text-slate-400">GP Equivalent</div>
                  <div className="font-bold text-amber-400 flex items-center justify-end gap-1">
                    <Coins className="w-3.5 h-3.5" />
                    <span>{selectedPlanForUpgrade.priceNaira.toLocaleString()} GP</span>
                  </div>
                </div>
              </div>

              {/* Benefits Checklist */}
              <div className="space-y-2">
                <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                  Included Privileges:
                </h4>
                <div className="grid grid-cols-1 gap-2 p-3.5 rounded-2xl bg-blue-50/50 dark:bg-blue-950/20 border border-blue-200/60 dark:border-blue-900/40">
                  {selectedPlanForUpgrade.benefits.map((b, i) => (
                    <div key={i} className="flex items-center gap-2 text-xs text-slate-700 dark:text-slate-200">
                      <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                      <span>{b}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Payment Method Selector */}
              <div className="space-y-2">
                <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                  Select Payment Method:
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* Card / Bank Option */}
                  <div
                    onClick={() => setUpgradePaymentMethod('CARD')}
                    className={`p-3.5 rounded-2xl border cursor-pointer transition flex items-start gap-3 ${
                      upgradePaymentMethod === 'CARD'
                        ? 'border-blue-600 bg-blue-50/60 dark:bg-blue-950/40 ring-2 ring-blue-500/20'
                        : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                    }`}
                  >
                    <div className="p-2 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400">
                      <CreditCard className="w-5 h-5" />
                    </div>
                    <div className="space-y-0.5">
                      <div className="text-xs font-bold text-slate-900 dark:text-white">Debit Card / Transfer</div>
                      <div className="text-[11px] text-slate-500 dark:text-slate-400">Instant Nigerian Card / Bank</div>
                    </div>
                  </div>

                  {/* GP Balance Option */}
                  <div
                    onClick={() => setUpgradePaymentMethod('GP')}
                    className={`p-3.5 rounded-2xl border cursor-pointer transition flex items-start gap-3 ${
                      upgradePaymentMethod === 'GP'
                        ? 'border-blue-600 bg-blue-50/60 dark:bg-blue-950/40 ring-2 ring-blue-500/20'
                        : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                    }`}
                  >
                    <div className="p-2 rounded-xl bg-amber-500/10 text-amber-500">
                      <Coins className="w-5 h-5" />
                    </div>
                    <div className="space-y-0.5">
                      <div className="text-xs font-bold text-slate-900 dark:text-white">GP Wallet Balance</div>
                      <div className="text-[11px] text-slate-500 dark:text-slate-400">
                        {currentUser.gpBalance?.toLocaleString() || 0} GP available
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex items-center justify-end gap-3">
                <button
                  type="button"
                  disabled={isUpgrading}
                  onClick={() => setSelectedPlanForUpgrade(null)}
                  className="px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
                >
                  Cancel
                </button>

                {upgradePaymentMethod === 'CARD' ? (
                  <button
                    type="button"
                    disabled={isUpgrading}
                    onClick={() => {
                      setUpgradeResult(null);
                      setIsPaystackOpen(true);
                    }}
                    className="px-6 py-2.5 rounded-xl bg-[#00C3F7] hover:bg-[#00a8d6] text-[#011b33] text-xs font-black shadow-lg shadow-blue-500/25 flex items-center gap-2 transition cursor-pointer disabled:opacity-60"
                  >
                    <CreditCard className="w-4 h-4" />
                    <span>Pay ₦{selectedPlanForUpgrade.priceNaira.toLocaleString()} via Paystack</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    disabled={isUpgrading || currentUser.gpBalance < selectedPlanForUpgrade.priceNaira}
                    onClick={async () => {
                      setIsUpgrading(true);
                      setUpgradeResult(null);
                      const res = await subscribeToPlan(selectedPlanForUpgrade, 'GP');
                      setUpgradeResult(res);
                      setIsUpgrading(false);
                      if (res.success) {
                        setTimeout(() => {
                          setSelectedPlanForUpgrade(null);
                        }, 2000);
                      }
                    }}
                    className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-white text-xs font-black shadow-lg shadow-amber-500/25 flex items-center gap-2 transition cursor-pointer disabled:opacity-60"
                  >
                    {isUpgrading ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        <span>Deducting GP & Activating...</span>
                      </>
                    ) : (
                      <>
                        <Coins className="w-4 h-4" />
                        <span>Pay {selectedPlanForUpgrade.priceNaira.toLocaleString()} GP</span>
                      </>
                    )}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Paystack Checkout Gateway Modal */}
      {isPaystackOpen && selectedPlanForUpgrade && (
        <PaystackGatewayModal
          plan={selectedPlanForUpgrade}
          userEmail={currentUser.email || (currentUser as any).registeredEmail || (currentUser.username?.includes('@') ? currentUser.username : `${currentUser.username || 'scholar'}@grobaax.org`)}
          userId={currentUser.id || 'scholar'}
          userName={currentUser.name || currentUser.fullName || 'Scholar'}
          onSuccess={async (reference) => {
            const planToUpgrade = selectedPlanForUpgrade;
            setIsPaystackOpen(false);
            if (!planToUpgrade) return;
            setIsUpgrading(true);
            const res = await subscribeToPlan(planToUpgrade, 'CARD', reference);
            setUpgradeResult(res);
            setIsUpgrading(false);
            if (res.success) {
              setTimeout(() => {
                setSelectedPlanForUpgrade(null);
              }, 2500);
            }
          }}
          onClose={() => setIsPaystackOpen(false)}
        />
      )}

      {/* Badge Purchase Modal */}
      <BadgePurchaseModal
        badge={selectedBadgeForPurchase}
        onClose={() => setSelectedBadgeForPurchase(null)}
      />

      {/* Account Deletion Confirmation Modal */}
      {showDeleteAccountModal && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-md w-full border border-rose-500/30 shadow-2xl p-6 space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center gap-3 text-rose-600">
              <div className="p-3 bg-rose-500/10 rounded-xl border border-rose-500/20">
                <Trash2 className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-extrabold text-slate-900 dark:text-white text-base">Permanently Delete Account?</h3>
                <p className="text-xs text-slate-400">This action is irreversible.</p>
              </div>
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              Are you sure you want to permanently erase your Grobaax account? Your academic records, GP wallet balance ({currentUser.gpBalance || 0} GP), unlocked badges, and forum messages will be permanently deleted.
            </p>

            {deleteError && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-500 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{deleteError}</span>
              </div>
            )}

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                disabled={isDeletingAccount}
                onClick={() => setShowDeleteAccountModal(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:text-slate-900 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isDeletingAccount}
                onClick={handleDeleteAccount}
                className="px-5 py-2 bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white font-black text-xs rounded-xl shadow-md transition-all cursor-pointer flex items-center gap-1.5"
              >
                {isDeletingAccount ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                <span>{isDeletingAccount ? 'Deleting Account...' : 'Yes, Delete My Account'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Helper Icon component for GUS Trophy
const TrophyIcon: React.FC<{ className?: string }> = ({ className = 'w-4 h-4' }) => (
  <svg
    className={className}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6" />
    <path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18" />
    <path d="M4 22h16" />
    <path d="M10 14.66V17c0 .55-.45 1-1 1H7" />
    <path d="M14 14.66V17c0 .55.45 1 1 1h2" />
    <path d="M18 2H6v7a6 6 0 0 0 12 0V2Z" />
  </svg>
);
