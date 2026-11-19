import React, { useState, useEffect, useLayoutEffect } from 'react';
import { GraduationCap } from 'lucide-react';
import { AppProvider, useApp } from './context/AppContext';
import { Header } from './components/Navigation/Header';
import { Navbar } from './components/Navigation/Navbar';
import { HomeTab } from './components/Home/HomeTab';
import { SchoolDomeView } from './components/SchoolDome/SchoolDomeView';
import { CommunityTab } from './components/Community/CommunityTab';
import { HintsView } from './components/Hints/HintsView';
import { SchoolBlogPortal } from './components/Community/Campus/Blog/SchoolBlogPortal';
import { InstitutionCategory } from './types';
import { WalletModal } from './components/Wallet/WalletModal';
import { AuthModal } from './components/Auth/AuthModal';
import { AuthLandingScreen } from './components/Auth/AuthLandingScreen';
import { AcademicProfileCompletionScreen } from './components/Auth/AcademicProfileCompletionScreen';
import { AdminPanelLayout } from './components/Admin/AdminPanelLayout';
import { UpgradePromoPopup } from './components/Subscription/UpgradePromoPopup';
import { InAppPushToast } from './components/Navigation/InAppPushToast';
import { PWASplashScreen } from './components/PWA/PWASplashScreen';
import { PWAInstallBanner } from './components/PWA/PWAInstallBanner';
import { OfflineIndicator } from './components/PWA/OfflineIndicator';
import { MobilePackagingModal } from './components/PWA/MobilePackagingModal';
import { AuthCallbackReturn } from './components/Auth/AuthCallbackReturn';
import { CorporateAdvertisingPortal } from './components/Corporate/CorporateAdvertisingPortal';
import { useDevicePlatform } from './hooks/useDevicePlatform';
import { isCorporateAdvertisingDomain } from './utils/domainPortal';

function resetViewportToTop(blurFocused = false) {
  if (typeof window === 'undefined') return;
  if (blurFocused && document.activeElement instanceof HTMLElement) {
    try {
      document.activeElement.blur();
    } catch (_) {}
  }
  window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
  document.documentElement.scrollTop = 0;
  document.body.scrollTop = 0;
}

class TabContentErrorBoundary extends React.Component<
  { activeTab: string; onResetHome: () => void; children: React.ReactNode },
  { hasError: boolean; errorTab: string }
> {
  constructor(props: { activeTab: string; onResetHome: () => void; children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, errorTab: props.activeTab };
  }

  static getDerivedStateFromError(_error: Error) {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('[App] Tab render error:', error, info);
  }

  componentDidUpdate(prevProps: { activeTab: string }) {
    if (this.state.hasError && prevProps.activeTab !== this.props.activeTab) {
      this.setState({ hasError: false, errorTab: this.props.activeTab });
    }
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="max-w-md mx-auto my-12 p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-lg text-center space-y-4">
          <h3 className="text-base font-black text-slate-900 dark:text-white">
            Something went wrong loading this view
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Please return home or refresh this section to continue.
          </p>
          <div className="flex items-center justify-center gap-2">
            <button
              type="button"
              onClick={() => {
                this.setState({ hasError: false });
                this.props.onResetHome();
              }}
              className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold cursor-pointer"
            >
              Return Home
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

function MainLayout() {
  const {
    activeTab,
    setActiveTab,
    firebaseUser,
    currentUser,
    isAuthModalOpen,
    setIsAuthModalOpen,
    authModalMode,
    login,
    viewMode,
    setViewMode,
  } = useApp();

  const { isIOS } = useDevicePlatform();

  const isAuthenticated = Boolean(firebaseUser);
  const isProfileLoaded = Boolean(
    firebaseUser &&
      currentUser &&
      (currentUser.id === firebaseUser.uid || currentUser.uid === firebaseUser.uid)
  );

  // Check if academic profile was marked complete in localStorage or Firestore
  const isLocallyCompleted = Boolean(
    firebaseUser &&
    typeof window !== 'undefined' &&
    localStorage.getItem(`grobax_academic_completed_${firebaseUser.uid}`) === 'true'
  );

  // If user has not completed academic profile, prompt Academic Profile Completion
  const isAcademicProfileComplete = Boolean(
    currentUser?.role === 'admin' ||
    currentUser?.role === 'super_admin' ||
    (currentUser?.role as string) === 'staff' ||
    currentUser?.role === 'community_manager' ||
    isLocallyCompleted ||
    currentUser?.academicProfileCompleted === true
  );

  // Always start fresh at the very top of the page when entering after auth/registration,
  // completing academic profile, toggling admin/app mode, or switching top-level tabs.
  useLayoutEffect(() => {
    resetViewportToTop(true);
    let rafId = 0;
    let timerId: ReturnType<typeof setTimeout> | undefined;
    rafId = window.requestAnimationFrame(() => {
      resetViewportToTop(false);
      timerId = setTimeout(() => resetViewportToTop(false), 80);
    });
    return () => {
      if (rafId) window.cancelAnimationFrame(rafId);
      if (timerId) clearTimeout(timerId);
    };
  }, [isAuthenticated, isProfileLoaded, isAcademicProfileComplete, viewMode, activeTab]);

  // If this window is the OAuth callback path, render the clean return screen that closes this tab
  if (typeof window !== 'undefined' && window.location.pathname.startsWith('/auth/callback')) {
    return <AuthCallbackReturn />;
  }

  // If user is not authenticated with Firebase, show Auth Landing Screen (Login/Register)
  if (!firebaseUser) {
    return <AuthLandingScreen />;
  }

  // If user is authenticated, but their profile document has not yet loaded for this uid,
  // show an authentic Scholar loading state instead of prematurely flashing AcademicProfileCompletionScreen
  if (!isProfileLoaded) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex flex-col items-center justify-center p-6 space-y-4 font-sans">
        <div className="w-14 h-14 rounded-2xl bg-blue-600 flex items-center justify-center animate-bounce shadow-xl shadow-blue-500/25">
          <GraduationCap className="w-8 h-8 text-white" />
        </div>
        <p className="text-sm font-bold text-slate-300 animate-pulse tracking-wide">
          Connecting Scholar Profile...
        </p>
      </div>
    );
  }

  if (!isAcademicProfileComplete) {
    return <AcademicProfileCompletionScreen />;
  }

  // Render Admin Panel when viewMode === 'admin'
  if (viewMode === 'admin') {
    return (
      <div className="w-full min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100">
        <AdminPanelLayout onReturnToUserApp={() => setViewMode('app')} />
        {/* Real-Time In-App Push Notification Toast Alerts for Admin */}
        <InAppPushToast />
      </div>
    );
  }

  return (
    <div className="w-full min-h-screen bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 selection:bg-blue-600 selection:text-white transition-colors duration-200">
      {/* Top Sticky Navigation & Header */}
      <Header onOpenAdminPanel={() => setViewMode('admin')} />

      {/* Main Tab Content View */}
      <main
        className="w-full"
        style={
          isIOS
            ? {
                paddingBottom: 'calc(4.75rem + env(safe-area-inset-bottom, 0px))',
              }
            : undefined
        }
      >
        <TabContentErrorBoundary
          activeTab={activeTab}
          onResetHome={() => setActiveTab('home')}
        >
          {activeTab === 'home' && <HomeTab />}
          {activeTab === 'school_dome' && (
            <div className="max-w-7xl mx-auto px-1.5 sm:px-4 lg:px-6 pt-1.5 sm:pt-3 pb-1.5 sm:pb-3">
              <SchoolDomeView initialTab="arena" />
            </div>
          )}
          {activeTab === 'school_dome_results' && (
            <div className="max-w-7xl mx-auto px-1.5 sm:px-4 lg:px-6 pt-1.5 sm:pt-3 pb-1.5 sm:pb-3">
              <SchoolDomeView initialTab="results" />
            </div>
          )}
          {activeTab === 'hints' && (
            <div className="max-w-7xl mx-auto px-1.5 sm:px-4 lg:px-6 pt-1.5 sm:pt-3 pb-1.5 sm:pb-3">
              <HintsView />
            </div>
          )}
          {activeTab === 'school_blog' && (() => {
            const homeInstitution =
              currentUser.institution ||
              currentUser.institutionName ||
              currentUser.academicProfile?.institutionName ||
              'Ekiti State University, Ado-Ekiti';
            const homeCategory: InstitutionCategory =
              (currentUser.institutionCategory as InstitutionCategory) ||
              (currentUser.academicProfile?.institutionCategory as InstitutionCategory) ||
              'University';
            return (
              <div className="max-w-7xl mx-auto px-2 sm:px-6 lg:px-8 pt-2 sm:pt-4 pb-10">
                <SchoolBlogPortal
                  institutionKey={homeInstitution}
                  institutionName={homeInstitution}
                  institutionCategory={homeCategory}
                  homeInstitutionName={homeInstitution}
                  backButtonLabel="Back to Home"
                  onBackToCampus={() => setActiveTab('home')}
                />
              </div>
            );
          })()}
          {activeTab === 'community' && <CommunityTab />}
        </TabContentErrorBoundary>
      </main>

      {/* Bottom Main User Navigation (Hidden, replaced by TopNavigation) */}
      <Navbar />

      {/* Wallet & Profile Modal */}
      <WalletModal />

      {/* Free User Upgrade Promo Pop-up (10-Minute Recurrence) */}
      <UpgradePromoPopup />

      {/* Real-Time In-App Push Notification Toast Alerts */}
      <InAppPushToast />

      {/* Firebase Authentication Modal */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        initialMode={authModalMode}
        onAuthSuccess={(profile) => {
          login(profile);
          setIsAuthModalOpen(false);
        }}
      />
    </div>
  );
}

function StudentAppRoot() {
  const [isMobileModalOpen, setIsMobileModalOpen] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined' && 'scrollRestoration' in window.history) {
      try {
        window.history.scrollRestoration = 'manual';
      } catch (_) {}
    }
    resetViewportToTop(false);

    const handleOpenMobileModal = () => setIsMobileModalOpen(true);
    window.addEventListener('open_mobile_packaging_modal', handleOpenMobileModal);
    return () => window.removeEventListener('open_mobile_packaging_modal', handleOpenMobileModal);
  }, []);

  return (
    <AppProvider>
      <PWASplashScreen />
      <MainLayout />
      <PWAInstallBanner />
      <OfflineIndicator />
      <MobilePackagingModal
        isOpen={isMobileModalOpen}
        onClose={() => setIsMobileModalOpen(false)}
      />
    </AppProvider>
  );
}

export default function App() {
  if (typeof window !== 'undefined' && isCorporateAdvertisingDomain()) {
    return <CorporateAdvertisingPortal />;
  }

  return <StudentAppRoot />;
}
