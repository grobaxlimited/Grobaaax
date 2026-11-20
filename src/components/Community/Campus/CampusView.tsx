import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useApp } from '../../../context/AppContext';
import {
  CampusMembership,
  CampusConnectionRequest,
  CampusStudentCard,
  CampusSkillCategory,
  InstitutionCategory,
} from '../../../types';
import {
  getCampusMembership,
  fetchCampusStudents,
  fetchCampusSkillCategories,
  subscribeCampusConnections,
  sendCampusChatRequest,
  respondCampusChatRequest,
  getSecureWhatsAppLink,
  resolveUserSubscriptionTier,
  followCampusStudent,
  unfollowCampusStudent,
  fetchCampusFollowStatus,
} from '../../../lib/campusService';
import { DEFAULT_CAMPUS_SKILL_CATEGORIES } from '../../../data/campusSkillsData';
import { consumePendingCampusView, PENDING_CAMPUS_VIEW_KEY } from '../../../lib/notificationRouting';
import { openExternalWhatsApp } from '../../../lib/whatsappUtils';
import {
  getFacultiesByCategory,
  getDepartmentsByFaculty,
} from '../../../data/academicStructureData';
import { StaticInstitution } from '../../../data/nigerianInstitutions';
import { CampusJoinScreen } from './CampusJoinScreen';
import { CampusStudentRow } from './CampusStudentRow';
import { CampusConnectionsView } from './CampusConnectionsView';
import { CampusEditWhatsAppModal } from './CampusEditWhatsAppModal';
import { CampusEditSkillsModal } from './CampusEditSkillsModal';
import { CampusStudentProfileModal } from './CampusStudentProfileModal';
import { ConnectOtherSchoolsView } from './ConnectOtherSchoolsView';
import { CrossCampusUpgradeModal } from './CrossCampusUpgradeModal';
import { SchoolBlogPortal } from './Blog/SchoolBlogPortal';
import { NotificationBadge } from '../../ui/NotificationBadge';
import {
  GraduationCap,
  Building2,
  BookOpen,
  Users,
  Search,
  ChevronLeft,
  ChevronRight,
  ArrowLeft,
  Phone,
  CheckCircle2,
  AlertCircle,
  Loader2,
  RefreshCw,
  FolderTree,
  Globe,
  Crown,
  Sparkles,
  MapPin,
  Newspaper,
  X,
} from 'lucide-react';

export const CampusView: React.FC = () => {
  const { currentUser, sectionNotifications, clearSectionNotification } = useApp();

  // 1. Membership State
  const [membership, setMembership] = useState<CampusMembership | null>(null);
  const [isCheckingMembership, setIsCheckingMembership] = useState(true);
  const [isEditWhatsAppOpen, setIsEditWhatsAppOpen] = useState(false);
  const [isEditSkillsOpen, setIsEditSkillsOpen] = useState(false);

  // 2. Navigation State within Campus
  const [activeView, setActiveView] = useState<'directory' | 'connections' | 'other_schools' | 'school_blog'>(
    () => consumePendingCampusView() || 'directory'
  );

  useEffect(() => {
    const handleOpenCampusView = (event: Event) => {
      const targetView = (event as CustomEvent)?.detail;
      if (
        targetView === 'directory' ||
        targetView === 'connections' ||
        targetView === 'other_schools' ||
        targetView === 'school_blog'
      ) {
        setActiveView(targetView);
        try {
          sessionStorage.removeItem(PENDING_CAMPUS_VIEW_KEY);
        } catch {}
        if (targetView === 'school_blog') {
          clearSectionNotification?.('school_blog');
        }
      }
    };
    window.addEventListener('grobax_open_campus_view', handleOpenCampusView);
    return () => window.removeEventListener('grobax_open_campus_view', handleOpenCampusView);
  }, [clearSectionNotification]);

  useEffect(() => {
    if (activeView === 'school_blog') {
      clearSectionNotification?.('school_blog');
    }
  }, [activeView, clearSectionNotification]);
  const tabsScrollRef = useRef<HTMLDivElement>(null);
  const [canScrollTabsLeft, setCanScrollTabsLeft] = useState(false);
  const [canScrollTabsRight, setCanScrollTabsRight] = useState(false);

  const updateTabsScrollState = useCallback(() => {
    const el = tabsScrollRef.current;
    if (!el) return;
    const maxScroll = el.scrollWidth - el.clientWidth;
    setCanScrollTabsLeft(el.scrollLeft > 4);
    setCanScrollTabsRight(maxScroll > 4 && el.scrollLeft < maxScroll - 4);
  }, []);

  const scrollTabsBy = (direction: 'left' | 'right') => {
    const el = tabsScrollRef.current;
    if (!el) return;
    const delta = Math.max(180, Math.round(el.clientWidth * 0.65));
    el.scrollBy({
      left: direction === 'right' ? delta : -delta,
      behavior: 'smooth',
    });
  };
  const [selectedFaculty, setSelectedFaculty] = useState<string | null>(null);
  const [selectedDepartment, setSelectedDepartment] = useState<string | null>(null);

  // 3. Search, Skills & Directory State
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSkillFilter, setSelectedSkillFilter] = useState<string>('');
  const [skillCategories, setSkillCategories] = useState<CampusSkillCategory[]>(DEFAULT_CAMPUS_SKILL_CATEGORIES);
  const [selectedProfileStudent, setSelectedProfileStudent] = useState<CampusStudentCard | null>(null);
  const [profileModalInitialView, setProfileModalInitialView] = useState<'profile' | 'followers' | 'following'>('profile');
  const [myFollowStats, setMyFollowStats] = useState<{ followersCount: number; followingCount: number }>({
    followersCount: 0,
    followingCount: 0,
  });
  const [students, setStudents] = useState<CampusStudentCard[]>([]);
  const [isLoadingStudents, setIsLoadingStudents] = useState(false);
  const [feedbackToast, setFeedbackToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  // 4. Real-time Connection Requests State
  const [connections, setConnections] = useState<{
    received: CampusConnectionRequest[];
    sent: CampusConnectionRequest[];
    accepted: CampusConnectionRequest[];
  }>({
    received: [],
    sent: [],
    accepted: [],
  });

  // User's Home Academic Institution Details
  const homeInstitutionName = useMemo(() => {
    return (
      currentUser.institution ||
      currentUser.institutionName ||
      currentUser.academicProfile?.institutionName ||
      'Ekiti State University, Ado-Ekiti'
    );
  }, [currentUser]);

  const homeInstitutionCategory: InstitutionCategory = useMemo(() => {
    return (
      (currentUser.institutionCategory as InstitutionCategory) ||
      (currentUser.academicProfile?.institutionCategory as InstitutionCategory) ||
      'University'
    );
  }, [currentUser]);

  // Active institution currently explored (defaults to home school; Premium/VIP can switch to any other Nigerian institution)
  const [activeInstitutionName, setActiveInstitutionName] = useState<string>(homeInstitutionName);
  const [activeInstitutionCategory, setActiveInstitutionCategory] = useState<InstitutionCategory>(homeInstitutionCategory);
  const [blogInstitutionName, setBlogInstitutionName] = useState<string>(homeInstitutionName);
  const [blogInstitutionCategory, setBlogInstitutionCategory] = useState<string>(homeInstitutionCategory);
  const [isCrossCampusUpgradeModalOpen, setIsCrossCampusUpgradeModalOpen] = useState(false);

  // Sync if home school loads from Firestore
  useEffect(() => {
    if (activeInstitutionName === 'Ekiti State University, Ado-Ekiti' && homeInstitutionName) {
      setActiveInstitutionName(homeInstitutionName);
      setActiveInstitutionCategory(homeInstitutionCategory);
      setBlogInstitutionName(homeInstitutionName);
      setBlogInstitutionCategory(homeInstitutionCategory);
    }
  }, [homeInstitutionName, homeInstitutionCategory]);

  const isCrossCampusActive = activeInstitutionName.toLowerCase() !== homeInstitutionName.toLowerCase();

  // Tier check for cross-campus discovery privilege
  const userTier = useMemo(() => resolveUserSubscriptionTier(currentUser), [currentUser]);
  const isPremiumOrVip =
    userTier === 'premium' ||
    userTier === 'vip' ||
    currentUser.role === 'admin' ||
    currentUser.role === 'super_admin' ||
    currentUser.isSuperAdmin ||
    currentUser.role === 'community_manager';

  const facultiesList = useMemo(() => {
    return getFacultiesByCategory(activeInstitutionCategory);
  }, [activeInstitutionCategory]);

  const departmentsList = useMemo(() => {
    if (!selectedFaculty) return [];
    return getDepartmentsByFaculty(activeInstitutionCategory, selectedFaculty);
  }, [activeInstitutionCategory, selectedFaculty]);

  // Show temporary toast feedback
  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setFeedbackToast({ message, type });
    setTimeout(() => {
      setFeedbackToast(null);
    }, 4000);
  };

  // 1. Initial Membership Fetch
  useEffect(() => {
    let isMounted = true;

    async function checkUserMembership() {
      if (!currentUser?.id) {
        setIsCheckingMembership(false);
        return;
      }
      setIsCheckingMembership(true);
      try {
        const mem = await getCampusMembership(currentUser.id);
        if (isMounted) {
          setMembership(mem);
        }
      } catch (err) {
        console.warn('Campus membership fetch note:', err);
      } finally {
        if (isMounted) {
          setIsCheckingMembership(false);
        }
      }
    }

    checkUserMembership();

    return () => {
      isMounted = false;
    };
  }, [currentUser?.id]);

  // 2. Real-time Connection Listener
  useEffect(() => {
    if (!currentUser?.id) return;
    const unsubscribe = subscribeCampusConnections(currentUser.id, (data) => {
      setConnections(data);
    });
    return () => unsubscribe();
  }, [currentUser?.id]);

  // 2b. Load extensible Campus Skill Categories & caller's own follow counts
  useEffect(() => {
    fetchCampusSkillCategories()
      .then((cats) => {
        if (Array.isArray(cats) && cats.length > 0) {
          setSkillCategories(cats.filter((c) => c.isActive !== false));
        }
      })
      .catch(() => {});
  }, []);

  const refreshMyFollowStats = useCallback(() => {
    if (!currentUser?.id) return;
    fetchCampusFollowStatus(currentUser.id).then((res) => {
      if (res.success) {
        setMyFollowStats({
          followersCount: res.followersCount,
          followingCount: res.followingCount,
        });
      }
    });
  }, [currentUser?.id]);

  useEffect(() => {
    refreshMyFollowStats();
  }, [refreshMyFollowStats]);

  // 2c. Track horizontal overflow on Campus navigation tabs so mobile users know to scroll
  useEffect(() => {
    updateTabsScrollState();
    const timer = setTimeout(updateTabsScrollState, 120);
    window.addEventListener('resize', updateTabsScrollState);
    let observer: ResizeObserver | null = null;
    if (typeof ResizeObserver !== 'undefined' && tabsScrollRef.current) {
      observer = new ResizeObserver(() => updateTabsScrollState());
      observer.observe(tabsScrollRef.current);
    }
    return () => {
      clearTimeout(timer);
      window.removeEventListener('resize', updateTabsScrollState);
      observer?.disconnect();
    };
  }, [updateTabsScrollState, membership, activeView, connections.received.length]);

  // 3. Load Students for selected department, skill filter, or search
  const loadStudents = async () => {
    if (!activeInstitutionName) return;
    setIsLoadingStudents(true);
    try {
      const list = await fetchCampusStudents({
        institution: activeInstitutionName,
        faculty: selectedFaculty || undefined,
        department: selectedDepartment || undefined,
        skill: selectedSkillFilter || undefined,
        search: searchQuery.trim() || undefined,
        currentUserId: currentUser.id,
      });
      setStudents(list);
    } catch (err) {
      console.warn('Error loading campus students:', err);
    } finally {
      setIsLoadingStudents(false);
    }
  };

  useEffect(() => {
    if (membership) {
      loadStudents();
    }
  }, [activeInstitutionName, selectedFaculty, selectedDepartment, selectedSkillFilter, searchQuery, membership]);

  // Cross-Campus Navigation Handlers
  const handleConnectWithOtherSchoolsClick = () => {
    if (!isPremiumOrVip) {
      setIsCrossCampusUpgradeModalOpen(true);
      return;
    }
    setActiveView('other_schools');
  };

  const handleSelectOtherInstitution = (inst: StaticInstitution) => {
    setActiveInstitutionName(inst.name);
    setActiveInstitutionCategory((inst.category as InstitutionCategory) || 'University');
    setSelectedFaculty(null);
    setSelectedDepartment(null);
    setSearchQuery('');
    setSelectedSkillFilter('');
    setActiveView('directory');
    showToast(`Switched campus to ${inst.name}. Select a faculty to explore.`);
  };

  const handleBackToHomeSchool = () => {
    setActiveInstitutionName(homeInstitutionName);
    setActiveInstitutionCategory(homeInstitutionCategory);
    setSelectedFaculty(null);
    setSelectedDepartment(null);
    setSearchQuery('');
    setSelectedSkillFilter('');
    setActiveView('directory');
    showToast(`Returned to your home campus: ${homeInstitutionName}`);
  };

  const handleOpenSchoolBlogTab = (instName?: string, instCategory?: string) => {
    setBlogInstitutionName(instName || activeInstitutionName || homeInstitutionName);
    setBlogInstitutionCategory(instCategory || activeInstitutionCategory || homeInstitutionCategory);
    setActiveView('school_blog');
    clearSectionNotification?.('school_blog');
  };

  // Handle Joining Campus
  const handleJoinedCampus = (whatsappNumber: string, skills?: string[], skillIds?: string[]) => {
    setMembership({
      id: currentUser.id,
      userId: currentUser.id,
      institution: homeInstitutionName,
      institutionCategory: homeInstitutionCategory,
      faculty: currentUser.faculty || currentUser.academicProfile?.facultyName || '',
      department: currentUser.department || currentUser.academicProfile?.departmentName || '',
      level: currentUser.level || currentUser.academicProfile?.level || '100 Level',
      whatsappNumber,
      whatsappVerified: true,
      skills: skills || [],
      skillIds: skillIds || [],
      joinedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      status: 'active',
    });
    showToast('🎉 Welcome to GROBAAX Campus! Your profile is verified.');
  };

  // Handle Send Chat Request
  const handleSendRequest = async (student: CampusStudentCard) => {
    const res = await sendCampusChatRequest(currentUser, student);
    if (res.success) {
      showToast(res.message || 'Connection request sent successfully!');
      // Update local student status immediately
      setStudents((prev) =>
        prev.map((s) => (s.id === student.id ? { ...s, connectionStatus: 'pending_sent' } : s))
      );
      setSelectedProfileStudent((prev) =>
        prev && prev.id === student.id ? { ...prev, connectionStatus: 'pending_sent' } : prev
      );
    } else {
      showToast(res.error || 'Failed to send request.', 'error');
    }
  };

  // Handle Accept Request
  const handleAcceptRequest = async (requestId: string, student: CampusStudentCard) => {
    const res = await respondCampusChatRequest(requestId, currentUser.id, 'ACCEPT');
    if (res.success) {
      showToast(res.message || 'Connection accepted! You can now chat on WhatsApp.');
      setStudents((prev) =>
        prev.map((s) => (s.id === student.id ? { ...s, connectionStatus: 'accepted' } : s))
      );
      setSelectedProfileStudent((prev) =>
        prev && prev.id === student.id ? { ...prev, connectionStatus: 'accepted' } : prev
      );
    } else {
      showToast(res.error || 'Failed to accept connection.', 'error');
    }
  };

  // Handle Reject Request
  const handleRejectRequest = async (requestId: string, student: CampusStudentCard) => {
    const res = await respondCampusChatRequest(requestId, currentUser.id, 'REJECT');
    if (res.success) {
      showToast(res.message || 'Connection request declined.');
      setStudents((prev) =>
        prev.map((s) => (s.id === student.id ? { ...s, connectionStatus: 'none' } : s))
      );
      setSelectedProfileStudent((prev) =>
        prev && prev.id === student.id ? { ...prev, connectionStatus: 'none' } : prev
      );
    } else {
      showToast(res.error || 'Failed to decline request.', 'error');
    }
  };

  // Handle Open WhatsApp Flow
  const handleOpenWhatsAppByStudent = async (student: CampusStudentCard) => {
    const res = await getSecureWhatsAppLink(currentUser.id, student.id, student.requestId);
    if (res.success && res.whatsappUrl) {
      openExternalWhatsApp(res.whatsappUrl);
    } else {
      showToast(res.error || 'Unable to open WhatsApp chat.', 'error');
    }
  };

  const handleOpenWhatsAppByRequest = async (targetUserId: string, targetName: string, requestId: string) => {
    const res = await getSecureWhatsAppLink(currentUser.id, targetUserId, requestId);
    if (res.success && res.whatsappUrl) {
      openExternalWhatsApp(res.whatsappUrl);
    } else {
      showToast(res.error || 'Unable to open WhatsApp chat.', 'error');
    }
  };

  // Handle Follow / Unfollow Toggle (independent of WhatsApp Chat Requests)
  const handleFollowChanged = (
    targetUserId: string,
    stats: { followersCount: number; followingCount: number; isFollowing: boolean }
  ) => {
    setStudents((prev) =>
      prev.map((s) =>
        s.id === targetUserId
          ? {
              ...s,
              followersCount: stats.followersCount,
              followingCount: stats.followingCount,
              isFollowing: stats.isFollowing,
            }
          : s
      )
    );
    setSelectedProfileStudent((prev) =>
      prev && prev.id === targetUserId
        ? {
            ...prev,
            followersCount: stats.followersCount,
            followingCount: stats.followingCount,
            isFollowing: stats.isFollowing,
          }
        : prev
    );
    refreshMyFollowStats();
  };

  const handleToggleFollow = async (student: CampusStudentCard) => {
    if (!currentUser?.id || student.id === currentUser.id) return;
    const res = student.isFollowing
      ? await unfollowCampusStudent(student.id)
      : await followCampusStudent(student.id);
    if (res.success) {
      const nextIsFollowing = Boolean(res.isFollowing ?? !student.isFollowing);
      const nextFollowers = Number(
        res.followersCount ??
          (student.isFollowing
            ? Math.max(0, Number(student.followersCount || 0) - 1)
            : Number(student.followersCount || 0) + 1)
      );
      const nextFollowing = Number(res.followingCount ?? student.followingCount ?? 0);
      handleFollowChanged(student.id, {
        followersCount: nextFollowers,
        followingCount: nextFollowing,
        isFollowing: nextIsFollowing,
      });
      showToast(
        nextIsFollowing ? `You are now following ${student.name}.` : `You unfollowed ${student.name}.`
      );
    } else {
      showToast(res.error || 'Failed to update follow status.', 'error');
    }
  };

  const openOwnFollowModal = (mode: 'followers' | 'following') => {
    if (!currentUser?.id) return;
    setProfileModalInitialView(mode);
    setSelectedProfileStudent({
      id: currentUser.id,
      name: currentUser.name || currentUser.fullName || 'Scholar',
      username: currentUser.username || '@scholar',
      avatar: currentUser.avatar || currentUser.profileImage || '',
      institution: homeInstitutionName,
      faculty: membership?.faculty || currentUser.faculty || '',
      department: membership?.department || currentUser.department || '',
      level: membership?.level || currentUser.level || '100 Level',
      bio: currentUser.bio || '',
      skills: membership?.skills || [],
      tier: userTier,
      hasBlueBadge: Boolean(currentUser.isVerified),
      isVerified: Boolean(currentUser.isVerified),
      isOnline: true,
      connectionStatus: 'self',
      joinedCampus: true,
      followersCount: myFollowStats.followersCount,
      followingCount: myFollowStats.followingCount,
      isFollowing: false,
    });
  };

  // Loading State
  if (isCheckingMembership) {
    return (
      <div className="flex flex-col items-center justify-center p-12 space-y-3">
        <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
        <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">
          Connecting to GROBAAX Campus...
        </p>
      </div>
    );
  }

  // If user hasn't joined campus yet, show join screen
  if (!membership) {
    return (
      <CampusJoinScreen
        currentUser={currentUser}
        onJoined={handleJoinedCampus}
      />
    );
  }

  return (
    <div className="space-y-5 animate-in fade-in duration-200">
      {/* Toast Feedback */}
      {feedbackToast && (
        <div
          className={`fixed top-5 right-5 z-50 p-4 rounded-2xl shadow-xl flex items-center gap-2.5 text-xs sm:text-sm font-bold animate-in slide-in-from-top-4 duration-200 border ${
            feedbackToast.type === 'success'
              ? 'bg-blue-600 text-white border-blue-500 shadow-blue-500/20'
              : 'bg-rose-600 text-white border-rose-500'
          }`}
        >
          {feedbackToast.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 shrink-0" />
          )}
          <span>{feedbackToast.message}</span>
        </div>
      )}

      {/* 1. TOP INSTITUTION HEADER & PROFILE BANNER */}
      <div className="p-5 sm:p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/30 flex items-center gap-1">
                <GraduationCap className="w-3 h-3 text-blue-600 dark:text-blue-400" /> CAMPUS DISCOVERY
              </span>
              <span className="text-xs font-semibold text-slate-400">•</span>
              <span className="text-xs font-bold text-slate-500 dark:text-slate-400">
                {activeInstitutionCategory}
              </span>
              {isCrossCampusActive && (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-500/20 text-amber-700 dark:text-amber-300 border border-amber-500/40 flex items-center gap-1">
                  <Globe className="w-3 h-3 text-amber-500" /> CROSS-CAMPUS ACTIVE
                </span>
              )}
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-slate-100 tracking-tight flex items-center gap-2 flex-wrap">
              <Building2 className="w-6 h-6 text-blue-600 dark:text-blue-400 shrink-0" />
              <span>{activeInstitutionName.toUpperCase()}</span>
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400">
              {isCrossCampusActive
                ? `Exploring cross-campus scholars and academic faculties at ${activeInstitutionName}.`
                : `Discover and connect with registered students from your institution.`}
            </p>
          </div>

          {/* User Quick Actions */}
          <div className="flex items-center gap-2 flex-wrap">
            <button
              id="campus-my-followers-btn"
              type="button"
              onClick={() => openOwnFollowModal('followers')}
              className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
              title="View your Campus Followers & Following"
            >
              <Users className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
              <span>
                {myFollowStats.followersCount} Followers · {myFollowStats.followingCount} Following
              </span>
            </button>

            <button
              id="campus-edit-skills-btn"
              type="button"
              onClick={() => setIsEditSkillsOpen(true)}
              className="px-3.5 py-2 rounded-xl bg-blue-50 hover:bg-blue-100 dark:bg-blue-950/40 dark:hover:bg-blue-900/50 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800/70 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
              <span>
                My Skills{membership.skills?.length ? ` (${membership.skills.length})` : ''}
              </span>
            </button>

            <button
              id="campus-edit-whatsapp-btn"
              type="button"
              onClick={() => setIsEditWhatsAppOpen(true)}
              className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <Phone className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
              <span>{membership.whatsappNumber || 'WhatsApp'}</span>
            </button>

            <button
              id="campus-refresh-btn"
              type="button"
              onClick={loadStudents}
              disabled={isLoadingStudents}
              className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition-all cursor-pointer"
              title="Refresh Directory"
            >
              <RefreshCw className={`w-4 h-4 ${isLoadingStudents ? 'animate-spin text-blue-600' : ''}`} />
            </button>
          </div>
        </div>

        {/* Cross-Campus Notification Pill if exploring another school */}
        {isCrossCampusActive && (
          <div className="flex items-center justify-between gap-3 p-3 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-900 dark:text-amber-200 text-xs font-bold flex-wrap">
            <div className="flex items-center gap-2">
              <Globe className="w-4 h-4 text-amber-500 shrink-0" />
              <span>
                Exploring: <strong>{activeInstitutionName}</strong> &bull; Home Campus: <strong>{homeInstitutionName}</strong>
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setActiveView('other_schools')}
                className="px-3 py-1 rounded-xl bg-amber-600 hover:bg-amber-700 text-white transition-colors cursor-pointer"
              >
                Change School
              </button>
              <button
                type="button"
                onClick={handleBackToHomeSchool}
                className="px-3 py-1 rounded-xl bg-slate-200 dark:bg-slate-800 text-slate-800 dark:text-slate-200 hover:bg-slate-300 dark:hover:bg-slate-700 transition-colors cursor-pointer"
              >
                ← Back to My School
              </button>
            </div>
          </div>
        )}

        {/* View Switcher: Directory vs Connections vs School Blog vs Other Schools */}
        <div className="pt-2 border-t border-slate-100 dark:border-slate-800/80 space-y-2">
          {(canScrollTabsLeft || canScrollTabsRight) && (
            <div className="flex items-center justify-between gap-2 text-[11px] font-bold">
              <span className="text-slate-500 dark:text-slate-400">
                Swipe sideways to view all Campus tabs
              </span>
              {canScrollTabsRight ? (
                <button
                  type="button"
                  onClick={() => scrollTabsBy('right')}
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/60 transition-colors cursor-pointer shrink-0"
                >
                  <span>More tabs</span>
                  <ChevronRight className="w-3.5 h-3.5 animate-pulse" />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => scrollTabsBy('left')}
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors cursor-pointer shrink-0"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                  <span>Back</span>
                </button>
              )}
            </div>
          )}

          <div className="relative">
            {canScrollTabsLeft && (
              <>
                <div className="pointer-events-none absolute inset-y-0 left-0 w-10 bg-gradient-to-r from-white dark:from-slate-900 to-transparent z-10" />
                <button
                  type="button"
                  aria-label="Scroll Campus tabs left"
                  onClick={() => scrollTabsBy('left')}
                  className="absolute left-0 top-1/2 -translate-y-1/2 z-20 w-7 h-7 rounded-full bg-white/95 dark:bg-slate-800/95 border border-slate-200 dark:border-slate-700 shadow-md flex items-center justify-center text-slate-700 dark:text-slate-200 hover:text-blue-600 hover:border-blue-400 transition-all cursor-pointer"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
              </>
            )}

            <div
              ref={tabsScrollRef}
              onScroll={updateTabsScrollState}
              className={`flex items-center gap-2 overflow-x-auto no-scrollbar scroll-smooth ${
                canScrollTabsLeft ? 'pl-8' : ''
              } ${canScrollTabsRight ? 'pr-8' : ''}`}
            >
              <button
                id="campus-tab-directory"
                type="button"
                onClick={() => setActiveView('directory')}
                className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center gap-2 whitespace-nowrap shrink-0 cursor-pointer ${
                  activeView === 'directory'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                }`}
              >
                <FolderTree className="w-4 h-4" />
                <span>Academic Directory</span>
              </button>

              <button
                id="campus-tab-connections"
                type="button"
                onClick={() => setActiveView('connections')}
                className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center gap-2 whitespace-nowrap shrink-0 cursor-pointer ${
                  activeView === 'connections'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                }`}
              >
                <Users className="w-4 h-4" />
                <span>My Connections</span>
                {connections.received.length > 0 && (
                  <span className="px-1.5 py-0.5 rounded-full text-[10px] font-black bg-rose-500 text-white animate-pulse">
                    {connections.received.length}
                  </span>
                )}
              </button>

              <button
                id="campus-tab-school-blog"
                type="button"
                onClick={() => handleOpenSchoolBlogTab(activeInstitutionName, activeInstitutionCategory)}
                className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center gap-2 whitespace-nowrap shrink-0 cursor-pointer ${
                  activeView === 'school_blog'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-900/50 border border-blue-200/80 dark:border-blue-800/60'
                }`}
              >
                <Newspaper className="w-4 h-4" />
                <span>School Blog</span>
                {Number(sectionNotifications?.school_blog || 0) > 0 && (
                  <NotificationBadge count={sectionNotifications.school_blog} />
                )}
              </button>

              <button
                id="campus-tab-other-schools"
                type="button"
                onClick={handleConnectWithOtherSchoolsClick}
                className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center gap-2 whitespace-nowrap shrink-0 cursor-pointer ${
                  activeView === 'other_schools'
                    ? 'bg-gradient-to-r from-amber-600 to-yellow-600 text-white shadow-xs'
                    : isPremiumOrVip
                    ? 'bg-amber-500/10 hover:bg-amber-500/20 text-amber-700 dark:text-amber-300 border border-amber-500/30'
                    : 'bg-slate-100 dark:bg-slate-800/80 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                }`}
              >
                <Globe className="w-4 h-4 text-amber-500" />
                <span>Connect with Other Schools</span>
                <span className="px-1.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-amber-500/20 text-amber-700 dark:text-amber-300 border border-amber-500/40 flex items-center gap-0.5">
                  <Crown className="w-2.5 h-2.5" />
                  VIP / PRO
                </span>
              </button>
            </div>

            {canScrollTabsRight && (
              <>
                <div className="pointer-events-none absolute inset-y-0 right-0 w-10 bg-gradient-to-l from-white dark:from-slate-900 to-transparent z-10" />
                <button
                  type="button"
                  aria-label="Scroll Campus tabs right"
                  onClick={() => scrollTabsBy('right')}
                  className="absolute right-0 top-1/2 -translate-y-1/2 z-20 w-7 h-7 rounded-full bg-blue-600 text-white shadow-md shadow-blue-600/30 flex items-center justify-center hover:bg-blue-700 transition-all cursor-pointer"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* 2. MAIN CONTENT AREA */}
      {activeView === 'school_blog' ? (
        <SchoolBlogPortal
          institutionKey={blogInstitutionName || activeInstitutionName}
          institutionName={blogInstitutionName || activeInstitutionName}
          institutionCategory={blogInstitutionCategory || activeInstitutionCategory}
          homeInstitutionName={homeInstitutionName}
          onBackToCampus={() => setActiveView('directory')}
          onSwitchBlogInstitution={(nextName, nextCat) => {
            setBlogInstitutionName(nextName);
            if (nextCat) setBlogInstitutionCategory(nextCat);
          }}
        />
      ) : activeView === 'other_schools' ? (
        <ConnectOtherSchoolsView
          onSelectInstitution={handleSelectOtherInstitution}
          onOpenSchoolBlog={(inst) => handleOpenSchoolBlogTab(inst.name, inst.category)}
          onBackToHomeSchool={handleBackToHomeSchool}
          homeInstitutionName={homeInstitutionName}
          currentViewingInstitutionName={activeInstitutionName}
        />
      ) : activeView === 'connections' ? (
        <CampusConnectionsView
          received={connections.received}
          sent={connections.sent}
          accepted={connections.accepted}
          onAccept={async (reqId, req) => {
            // Optimistic update
            setConnections((prev) => {
              const targetReq = prev.received.find((r) => r.id === reqId) || req;
              const updatedReq: CampusConnectionRequest = {
                ...targetReq,
                id: reqId,
                status: 'ACCEPTED',
                respondedAt: new Date().toISOString(),
              };
              return {
                ...prev,
                received: prev.received.filter((r) => r.id !== reqId && r.id !== targetReq.id),
                accepted: [updatedReq, ...prev.accepted.filter((r) => r.id !== reqId && r.id !== targetReq.id)],
              };
            });

            // Update student card connection status in directory
            setStudents((prev) =>
              prev.map((s) => (s.id === req?.senderId || s.requestId === reqId ? { ...s, connectionStatus: 'accepted' } : s))
            );

            const res = await respondCampusChatRequest(reqId, currentUser.id, 'ACCEPT');
            if (res.success) {
              showToast(res.message || 'Connection accepted! You can now chat on WhatsApp.');
            } else {
              showToast(res.error || 'Failed to accept.', 'error');
            }
          }}
          onReject={async (reqId, req) => {
            // Optimistic update
            setConnections((prev) => ({
              ...prev,
              received: prev.received.filter((r) => r.id !== reqId && r.id !== req?.id),
            }));

            setStudents((prev) =>
              prev.map((s) => (s.id === req?.senderId || s.requestId === reqId ? { ...s, connectionStatus: 'none' } : s))
            );

            const res = await respondCampusChatRequest(reqId, currentUser.id, 'REJECT');
            if (res.success) {
              showToast(res.message || 'Connection declined.');
            } else {
              showToast(res.error || 'Failed to decline.', 'error');
            }
          }}
          onOpenWhatsApp={handleOpenWhatsAppByRequest}
          currentUserId={currentUser.id}
          students={students}
        />
      ) : (
        <div className="space-y-4">
          {/* Breadcrumbs & Search Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800">
            {/* Breadcrumb Navigation */}
            <div className="flex items-center gap-1.5 text-xs font-bold text-slate-500 dark:text-slate-400 flex-wrap">
              <button
                type="button"
                onClick={() => {
                  setSelectedFaculty(null);
                  setSelectedDepartment(null);
                }}
                className={`hover:text-blue-600 dark:hover:text-blue-400 transition-colors cursor-pointer ${
                  !selectedFaculty ? 'text-blue-600 dark:text-blue-400 font-black' : ''
                }`}
              >
                All Faculties
              </button>

              {selectedFaculty && (
                <>
                  <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                  <button
                    type="button"
                    onClick={() => setSelectedDepartment(null)}
                    className={`hover:text-blue-600 dark:hover:text-blue-400 transition-colors cursor-pointer ${
                      !selectedDepartment ? 'text-blue-600 dark:text-blue-400 font-black' : ''
                    }`}
                  >
                    {selectedFaculty}
                  </button>
                </>
              )}

              {selectedDepartment && (
                <>
                  <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                  <span className="text-blue-600 dark:text-blue-400 font-black truncate max-w-[160px]">
                    {selectedDepartment}
                  </span>
                </>
              )}
            </div>

            {/* Instant Search & Skill Filter Controls */}
            <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
              <div className="relative min-w-[170px] sm:w-52">
                <Sparkles className="w-3.5 h-3.5 text-blue-500 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <select
                  id="campus-skill-filter-select"
                  value={selectedSkillFilter}
                  onChange={(e) => setSelectedSkillFilter(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-800 dark:text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-blue-500 cursor-pointer"
                >
                  <option value="">All Skills (Filter)</option>
                  {skillCategories.map((cat) => (
                    <option key={cat.id} value={cat.name}>
                      {cat.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="relative min-w-[190px] sm:w-56 flex-1">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search scholar, dept, skill..."
                  className="w-full pl-9 pr-3 py-1.5 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {selectedSkillFilter && (
                <button
                  type="button"
                  onClick={() => setSelectedSkillFilter('')}
                  className="px-2.5 py-1.5 rounded-xl bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-800 text-xs font-bold flex items-center gap-1 cursor-pointer shrink-0"
                  title="Clear skill filter"
                >
                  <span>{selectedSkillFilter}</span>
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>
          </div>

          {/* VIEW LEVEL 1: ALL FACULTIES (when no faculty, search query, or skill filter) */}
          {!selectedFaculty && !searchQuery && !selectedSkillFilter && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-black uppercase tracking-wider text-slate-900 dark:text-slate-100 flex items-center gap-2">
                  <GraduationCap className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                  <span>Faculties in {activeInstitutionName}</span>
                </h3>
                <span className="text-xs font-bold text-slate-500">
                  {facultiesList.length} Faculties
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {facultiesList.map((fac) => (
                  <button
                    key={fac.id || fac.name}
                    type="button"
                    onClick={() => setSelectedFaculty(fac.name)}
                    className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-blue-500/50 hover:shadow-md transition-all text-left group cursor-pointer space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-2xl p-2 rounded-xl bg-slate-100 dark:bg-slate-800 group-hover:scale-110 transition-transform">
                        {fac.icon || '🏛️'}
                      </span>
                      <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-blue-600 group-hover:translate-x-1 transition-all" />
                    </div>
                    <div>
                      <h4 className="font-bold text-sm text-slate-900 dark:text-slate-100 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                        {fac.name}
                      </h4>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                        {fac.departments.length} Academic Departments
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* VIEW LEVEL 2: DEPARTMENTS IN SELECTED FACULTY */}
          {selectedFaculty && !selectedDepartment && !searchQuery && !selectedSkillFilter && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setSelectedFaculty(null)}
                    className="p-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition-all cursor-pointer"
                  >
                    <ArrowLeft className="w-4 h-4" />
                  </button>
                  <h3 className="text-sm font-black uppercase tracking-wider text-slate-900 dark:text-slate-100">
                    {selectedFaculty}
                  </h3>
                </div>
                <span className="text-xs font-bold text-slate-500">
                  {departmentsList.length} Departments
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {departmentsList.map((deptName) => (
                  <button
                    key={deptName}
                    type="button"
                    onClick={() => setSelectedDepartment(deptName)}
                    className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-blue-500/50 hover:shadow-md transition-all text-left group cursor-pointer space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <div className="w-8 h-8 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                        <BookOpen className="w-4 h-4" />
                      </div>
                      <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-blue-600 group-hover:translate-x-1 transition-all" />
                    </div>
                    <div>
                      <h4 className="font-bold text-sm text-slate-900 dark:text-slate-100 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                        {deptName}
                      </h4>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 flex items-center gap-1">
                        <Users className="w-3 h-3 text-blue-600 dark:text-blue-400" />
                        <span>Browse Scholars</span>
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* VIEW LEVEL 3: STUDENT DIRECTORY (Department, Skill Filter, or Search Results) */}
          {(selectedDepartment || searchQuery || selectedSkillFilter) && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 min-w-0">
                  {selectedDepartment && (
                    <button
                      type="button"
                      onClick={() => setSelectedDepartment(null)}
                      className="p-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition-all cursor-pointer shrink-0"
                    >
                      <ArrowLeft className="w-4 h-4" />
                    </button>
                  )}
                  <h3 className="text-sm font-black uppercase tracking-wider text-slate-900 dark:text-slate-100 truncate">
                    {selectedSkillFilter && searchQuery
                      ? `${selectedSkillFilter} · "${searchQuery}"`
                      : selectedSkillFilter
                      ? `Scholars with Skill: ${selectedSkillFilter}`
                      : searchQuery
                      ? `Search Results for "${searchQuery}"`
                      : selectedDepartment}
                  </h3>
                </div>
                <span className="text-xs font-bold text-slate-500 shrink-0">
                  {students.length} Scholars Found
                </span>
              </div>

              {isLoadingStudents ? (
                <div className="p-12 text-center rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-2">
                  <Loader2 className="w-6 h-6 text-blue-600 animate-spin mx-auto" />
                  <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                    Loading scholars...
                  </p>
                </div>
              ) : students.length === 0 ? (
                <div className="p-8 text-center rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-3">
                  <div className="w-12 h-12 mx-auto rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400">
                    <Users className="w-6 h-6" />
                  </div>
                  <div className="space-y-1">
                    <h4 className="text-base font-bold text-slate-900 dark:text-slate-100">
                      No Registered Scholars Found
                    </h4>
                    <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
                      {selectedSkillFilter
                        ? `No scholars in ${activeInstitutionName} have listed "${selectedSkillFilter}" yet.`
                        : searchQuery
                        ? 'Try searching with a different name, skill, faculty, or department keyword.'
                        : `Be the first scholar in ${selectedDepartment || 'this department'} to connect on GROBAAX Campus!`}
                    </p>
                  </div>
                </div>
              ) : (
                <div className="space-y-2.5">
                  {students.map((student) => (
                    <CampusStudentRow
                      key={student.id}
                      student={student}
                      onSendRequest={handleSendRequest}
                      onAcceptRequest={handleAcceptRequest}
                      onRejectRequest={handleRejectRequest}
                      onOpenWhatsApp={handleOpenWhatsAppByStudent}
                      onToggleFollow={handleToggleFollow}
                      onViewProfile={(st) => {
                        setProfileModalInitialView('profile');
                        setSelectedProfileStudent(st);
                      }}
                    />
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* 3. EDIT WHATSAPP NUMBER MODAL */}
      <CampusEditWhatsAppModal
        userId={currentUser.id}
        currentNumber={membership.whatsappNumber}
        isOpen={isEditWhatsAppOpen}
        onClose={() => setIsEditWhatsAppOpen(false)}
        onUpdated={(newNumber) => {
          setMembership((prev) => (prev ? { ...prev, whatsappNumber: newNumber } : null));
          showToast('WhatsApp number updated successfully!');
        }}
      />

      {/* 3B. EDIT CAMPUS SKILLS MODAL */}
      <CampusEditSkillsModal
        userId={currentUser.id}
        currentSkills={membership.skills || []}
        currentSkillIds={membership.skillIds || []}
        isOpen={isEditSkillsOpen}
        onClose={() => setIsEditSkillsOpen(false)}
        onUpdated={(skills, skillIds) => {
          setMembership((prev) => (prev ? { ...prev, skills, skillIds } : null));
          showToast('Campus skills updated successfully!');
          loadStudents();
        }}
      />

      {/* 3C. STUDENT PROFILE, FOLLOWERS & SKILLS MODAL */}
      <CampusStudentProfileModal
        student={selectedProfileStudent}
        currentUserId={currentUser.id}
        initialViewMode={profileModalInitialView}
        isOpen={Boolean(selectedProfileStudent)}
        onClose={() => setSelectedProfileStudent(null)}
        onSendRequest={handleSendRequest}
        onAcceptRequest={handleAcceptRequest}
        onRejectRequest={handleRejectRequest}
        onOpenWhatsApp={handleOpenWhatsAppByStudent}
        onFollowChanged={handleFollowChanged}
        onNotify={showToast}
        onFilterBySkill={(sk) => {
          setSelectedSkillFilter(sk);
          setActiveView('directory');
        }}
      />

      {/* 4. CROSS-CAMPUS UPGRADE MODAL (For Free Scholars) */}
      <CrossCampusUpgradeModal
        isOpen={isCrossCampusUpgradeModalOpen}
        onClose={() => setIsCrossCampusUpgradeModalOpen(false)}
        homeInstitution={homeInstitutionName}
      />
    </div>
  );
};
