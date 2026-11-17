import React, { useCallback, useEffect, useState } from 'react';
import {
  CorporatePortalRoute,
  getCorporatePortalRoute,
  isCorporateAdvertisingDomain,
} from '../../utils/domainPortal';
import {
  CorporateAccount,
  fetchCorporateMe,
  getStoredCorporateCompany,
  getStoredCorporateToken,
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

  useEffect(() => {
    const syncRoute = () => setRoute(getCorporatePortalRoute());
    window.addEventListener('popstate', syncRoute);
    return () => window.removeEventListener('popstate', syncRoute);
  }, []);

  // Rehydrate corporate session cleanly if corporate token exists
  useEffect(() => {
    const token = getStoredCorporateToken();
    if (!token) return;
    let mounted = true;
    fetchCorporateMe().then((res) => {
      if (!mounted) return;
      if (res.success && res.company) {
        setCompany(res.company);
      } else if (!res.success) {
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
        if (window.location.pathname !== targetPath) {
          window.history.pushState({}, '', targetPath);
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
            navigateTo('login', '/login');
          }}
        />
      );
    }
    return (
      <CorporateLoginView
        onNavigate={handlePortalLinkClick}
        onSuccess={(loggedCompany) => {
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
        onSuccess={(createdCompany) => {
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
        onSuccess={(loggedCompany) => {
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
