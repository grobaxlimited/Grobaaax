import React, { useCallback, useEffect, useState } from 'react';
import {
  CorporatePortalRoute,
  getCorporatePortalRoute,
  isCorporateAdvertisingDomain,
  isCorporateAdvertisingHostname,
} from '../../utils/domainPortal';
import {
  CorporateAccount,
  StudentCompletionPrefill,
  clearCorporateSession,
  fetchCorporateMe,
  getStoredCompletionPrefill,
  getStoredCorporateCompany,
  getStoredCorporateToken,
  setStoredCompletionPrefill,
} from '../../lib/corporateAdsService';
import { CorporateLandingPage } from './CorporateLandingPage';
import { CorporateApplicationView } from './CorporateApplicationView';
import { CorporateLoginView } from './CorporateLoginView';
import { CorporateDashboardView } from './CorporateDashboardView';

export const CorporateAdvertisingPortal: React.FC = () => {
  const [route, setRoute] = useState<CorporatePortalRoute>(() =>
    getCorporatePortalRoute()
  );
  const [company, setCompany] = useState<CorporateAccount | null>(() =>
    getStoredCorporateCompany()
  );
  const [completionPrefill, setCompletionPrefill] =
    useState<StudentCompletionPrefill | null>(() => getStoredCompletionPrefill());

  useEffect(() => {
    const syncRoute = () => setRoute(getCorporatePortalRoute());
    window.addEventListener('popstate', syncRoute);
    return () => window.removeEventListener('popstate', syncRoute);
  }, []);

  // Rehydrate corporate session cleanly if corporate token exists (skip when user is in completion mode)
  useEffect(() => {
    const token = getStoredCorporateToken();
    const pendingPrefill = getStoredCompletionPrefill();
    const cachedCompany = getStoredCorporateCompany();
    if (!token || (pendingPrefill && !cachedCompany)) return;

    let mounted = true;
    fetchCorporateMe().then((res) => {
      if (!mounted) return;
      if (res.success && res.company) {
        setCompany(res.company);
        setCompletionPrefill(null);
        setStoredCompletionPrefill(null);
      } else if (!res.success && !getStoredCompletionPrefill()) {
        setCompany(null);
      }
    });
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (route === 'apply') {
      document.title = 'Apply to Advertise | Grobaax Corporate Advertising';
    } else if (route === 'login') {
      document.title = 'Company Login | Grobaax Corporate Advertising';
    } else if (route === 'dashboard') {
      document.title = 'Company Dashboard | Grobaax Corporate Advertising';
    } else {
      document.title = 'Grobaax Corporate Advertising';
    }
  }, [route]);

  const navigateTo = useCallback(
    (
      targetRoute: CorporatePortalRoute,
      targetPath: '/' | '/apply' | '/login' | '/dashboard'
    ) => {
      if (typeof window !== 'undefined') {
        const useSubdomainPaths = isCorporateAdvertisingHostname();
        const resolvedPath = useSubdomainPaths
          ? targetPath
          : targetPath === '/'
          ? '/advertise'
          : `/advertise${targetPath}`;
        if (window.location.pathname !== resolvedPath) {
          window.history.pushState({}, '', resolvedPath);
        }
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
      setRoute(targetRoute);
    },
    []
  );

  const handlePortalLinkClick = useCallback(
    (
      event: React.MouseEvent<HTMLAnchorElement>,
      targetRoute: CorporatePortalRoute,
      targetPath: '/' | '/apply' | '/login' | '/dashboard'
    ) => {
      if (typeof window !== 'undefined' && isCorporateAdvertisingDomain()) {
        event.preventDefault();
        navigateTo(targetRoute, targetPath);
      }
    },
    [navigateTo]
  );

  const handleRequiresCompletion = useCallback(
    (prefill: StudentCompletionPrefill) => {
      setCompletionPrefill(prefill);
      setStoredCompletionPrefill(prefill);
      navigateTo('apply', '/apply');
    },
    [navigateTo]
  );

  // If user visits /dashboard directly without session, show Corporate Login cleanly
  if (route === 'dashboard') {
    if (company) {
      return (
        <CorporateDashboardView
          initialCompany={company}
          onNavigate={handlePortalLinkClick}
          onCompanyUpdated={setCompany}
          onSignedOut={() => {
            setCompany(null);
            setCompletionPrefill(null);
            navigateTo('login', '/login');
          }}
        />
      );
    }
    return (
      <CorporateLoginView
        onNavigate={handlePortalLinkClick}
        onRequiresCompletion={handleRequiresCompletion}
        onSuccess={(loggedCompany) => {
          setCompletionPrefill(null);
          setStoredCompletionPrefill(null);
          setCompany(loggedCompany);
          navigateTo('dashboard', '/dashboard');
        }}
      />
    );
  }

  if (route === 'apply') {
    return (
      <CorporateApplicationView
        onNavigate={handlePortalLinkClick}
        completionPrefill={completionPrefill}
        onCancelCompletion={() => {
          clearCorporateSession();
          setCompletionPrefill(null);
          navigateTo('login', '/login');
        }}
        onSuccess={(createdCompany) => {
          setCompletionPrefill(null);
          setStoredCompletionPrefill(null);
          setCompany(createdCompany);
          navigateTo('dashboard', '/dashboard');
        }}
      />
    );
  }

  if (route === 'login') {
    return (
      <CorporateLoginView
        onNavigate={handlePortalLinkClick}
        onRequiresCompletion={handleRequiresCompletion}
        onSuccess={(loggedCompany) => {
          setCompletionPrefill(null);
          setStoredCompletionPrefill(null);
          setCompany(loggedCompany);
          navigateTo('dashboard', '/dashboard');
        }}
      />
    );
  }

  return (
    <CorporateLandingPage
      onNavigate={handlePortalLinkClick}
      activeCompany={company}
    />
  );
};
