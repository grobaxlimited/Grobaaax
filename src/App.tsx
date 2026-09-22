import React, { useState } from 'react';
import { AppProvider, useApp } from './context/AppContext';
import { Header } from './components/Navigation/Header';
import { Navbar } from './components/Navigation/Navbar';
import { HomeTab } from './components/Home/HomeTab';
import { ChatroomLiveView } from './components/Community/ChatroomLive/ChatroomLiveView';
import { SchoolDomeView } from './components/SchoolDome/SchoolDomeView';
import { CommunityTab } from './components/Community/CommunityTab';
import { LibraryTab } from './components/Library/LibraryTab';
import { HintsView } from './components/Hints/HintsView';
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
import { useDevicePlatform } from './hooks/useDevicePlatform';

function MainLayout() {
  const {
    activeTab,
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

  // If user is not authenticated with Firebase, show Auth Landing Screen (Login/Register)
  if (!firebaseUser) {
    return <AuthLandingScreen />;
  }

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
        {activeTab === 'home' && <HomeTab />}
        {activeTab === 'daily_qa' && (
          <div className="max-w-7xl mx-auto px-1.5 sm:px-4 lg:px-6 pt-1.5 sm:pt-3 pb-1.5 sm:pb-3">
            <ChatroomLiveView />
          </div>
        )}
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
        {activeTab === 'library' && <LibraryTab />}
        {activeTab === 'community' && <CommunityTab />}
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
        }}
      />
    </div>
  );
}

export default function App() {
  return (
    <AppProvider>
      <PWASplashScreen />
      <MainLayout />
      <PWAInstallBanner />
      <OfflineIndicator />
    </AppProvider>
  );
}
