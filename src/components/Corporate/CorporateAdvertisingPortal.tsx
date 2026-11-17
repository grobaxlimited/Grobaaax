import React, { useEffect, useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  Building2,
  CheckCircle2,
  ClipboardCheck,
  Clock,
  FileText,
  Layers,
  ShieldCheck,
} from 'lucide-react';
import {
  CORPORATE_APPLY_URL,
  CORPORATE_LOGIN_URL,
  CORPORATE_PORTAL_ORIGIN,
  CorporatePortalRoute,
  getCorporatePortalRoute,
  isCorporateAdvertisingDomain,
} from '../../utils/domainPortal';

const HOW_IT_WORKS_STEPS = [
  {
    step: '01',
    title: 'Submit a Company Application',
    description:
      'A business or organization applies to advertise on Grobaax and provides company background and intended campaign details.',
    icon: Building2,
  },
  {
    step: '02',
    title: 'Grobaax Review & Approval',
    description:
      'Grobaax reviews every applicant company and its advertising materials to verify quality and institutional suitability.',
    icon: ClipboardCheck,
  },
  {
    step: '03',
    title: 'Subscribe to an Advertising Plan',
    description:
      'Once approved, the company can subscribe to an available corporate advertising plan for its campaign schedule.',
    icon: Layers,
  },
  {
    step: '04',
    title: 'Display Beneath School Blog Articles',
    description:
      'Approved and active corporate advertisements appear in designated sponsored slots directly beneath School Blog articles across participating institutions.',
    icon: CheckCircle2,
  },
] as const;

export const CorporateAdvertisingPortal: React.FC = () => {
  const [route, setRoute] = useState<CorporatePortalRoute>(() =>
    getCorporatePortalRoute()
  );

  useEffect(() => {
    const syncRoute = () => setRoute(getCorporatePortalRoute());
    window.addEventListener('popstate', syncRoute);
    return () => window.removeEventListener('popstate', syncRoute);
  }, []);

  useEffect(() => {
    if (route === 'apply') {
      document.title = 'Apply to Advertise | Grobaax Corporate Advertising';
    } else if (route === 'login') {
      document.title = 'Company Login | Grobaax Corporate Advertising';
    } else {
      document.title = 'Grobaax Corporate Advertising';
    }
  }, [route]);

  const handlePortalLinkClick = (
    event: React.MouseEvent<HTMLAnchorElement>,
    targetRoute: CorporatePortalRoute,
    targetPath: '/' | '/apply' | '/login'
  ) => {
    // Preserve exact external href when previewed off-domain; handle SPA transitions cleanly on advertise.grobaax.com
    if (typeof window !== 'undefined' && isCorporateAdvertisingDomain()) {
      event.preventDefault();
      if (window.location.pathname !== targetPath) {
        window.history.pushState({}, '', targetPath);
      }
      setRoute(targetRoute);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900 antialiased selection:bg-blue-700 selection:text-white">
      {/* Top Bar — 3 Clean Zones */}
      <header className="sticky top-0 z-30 border-b border-slate-200/90 bg-white/95 backdrop-blur-sm">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
          <a
            href={`${CORPORATE_PORTAL_ORIGIN}/`}
            onClick={(e) => handlePortalLinkClick(e, 'landing', '/')}
            className="flex items-center gap-2.5 shrink-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 rounded-md"
          >
            <div className="w-9 h-9 rounded-lg bg-slate-900 text-white flex items-center justify-center font-bold text-base tracking-tight">
              G
            </div>
            <span className="font-bold text-sm sm:text-base tracking-tight text-slate-900 whitespace-nowrap">
              Grobaax Corporate Advertising
            </span>
          </a>

          {route === 'landing' && (
            <nav
              aria-label="Corporate portal sections"
              className="hidden md:flex items-center gap-7 text-sm font-medium text-slate-600"
            >
              <a
                href="#overview"
                className="hover:text-slate-900 transition-colors whitespace-nowrap"
              >
                Overview
              </a>
              <a
                href="#how-it-works"
                className="hover:text-slate-900 transition-colors whitespace-nowrap"
              >
                How It Works
              </a>
              <a
                href="#placement"
                className="hover:text-slate-900 transition-colors whitespace-nowrap"
              >
                Placement Standard
              </a>
            </nav>
          )}

          <div className="flex items-center gap-2.5 sm:gap-3 shrink-0">
            <a
              href={CORPORATE_LOGIN_URL}
              onClick={(e) => handlePortalLinkClick(e, 'login', '/login')}
              className="px-3.5 py-2 text-xs sm:text-sm font-semibold text-slate-700 hover:text-slate-900 border border-slate-300 hover:border-slate-400 bg-white rounded-lg transition-colors whitespace-nowrap shrink-0"
            >
              Company Login
            </a>
            <a
              href={CORPORATE_APPLY_URL}
              onClick={(e) => handlePortalLinkClick(e, 'apply', '/apply')}
              className="px-3.5 sm:px-4 py-2 text-xs sm:text-sm font-semibold text-white bg-blue-700 hover:bg-blue-800 rounded-lg transition-colors whitespace-nowrap shrink-0"
            >
              Apply to Advertise
            </a>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1">
        {route === 'landing' && (
          <>
            {/* Hero Section */}
            <section
              id="overview"
              className="border-b border-slate-200 bg-white"
            >
              <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-14 sm:py-20 lg:py-24">
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-center">
                  <div className="lg:col-span-7 space-y-6">
                    <p className="text-xs sm:text-sm font-semibold uppercase tracking-[0.14em] text-blue-700">
                      Institutional School Blog Network
                    </p>
                    <h1 className="text-3xl sm:text-5xl font-bold tracking-tight text-slate-950 leading-[1.1]">
                      Reach campus readers across Grobaax School Blogs.
                    </h1>
                    <p className="text-base sm:text-lg text-slate-600 leading-relaxed max-w-2xl">
                      Grobaax Corporate Advertising connects approved businesses and
                      organizations with student audiences across participating
                      tertiary institutions. Companies advertise their products and
                      services through clearly labeled sponsored placements displayed
                      beneath published School Blog articles.
                    </p>

                    <div className="pt-2 flex flex-wrap items-center gap-3.5">
                      <a
                        href={CORPORATE_APPLY_URL}
                        onClick={(e) => handlePortalLinkClick(e, 'apply', '/apply')}
                        className="inline-flex items-center gap-2 px-5 py-3 text-sm sm:text-base font-semibold text-white bg-blue-700 hover:bg-blue-800 rounded-lg transition-colors whitespace-nowrap shrink-0"
                      >
                        Apply to Advertise
                        <ArrowRight className="w-4 h-4" />
                      </a>
                      <a
                        href={CORPORATE_LOGIN_URL}
                        onClick={(e) => handlePortalLinkClick(e, 'login', '/login')}
                        className="inline-flex items-center gap-2 px-5 py-3 text-sm sm:text-base font-semibold text-slate-800 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded-lg transition-colors whitespace-nowrap shrink-0"
                      >
                        Company Login
                      </a>
                    </div>

                    <p className="text-xs sm:text-sm text-slate-500 flex items-center gap-2 pt-1">
                      <ShieldCheck className="w-4 h-4 text-slate-600 shrink-0" />
                      <span>
                        All corporate advertisers and campaign materials are subject
                        to Grobaax review and approval prior to publication.
                      </span>
                    </p>
                  </div>

                  {/* Visual Article Placement Schematic */}
                  <div className="lg:col-span-5">
                    <div className="rounded-xl border border-slate-200 bg-slate-50 p-5 sm:p-6">
                      <div className="flex items-center justify-between pb-3.5 mb-4 border-b border-slate-200">
                        <div className="flex items-center gap-2 text-xs font-semibold text-slate-700">
                          <FileText className="w-4 h-4 text-blue-700" />
                          <span>School Blog Article Layout</span>
                        </div>
                        <span className="text-[11px] font-medium text-slate-500">
                          Participating Institutions
                        </span>
                      </div>

                      {/* Simulated Editorial Body */}
                      <div className="rounded-lg bg-white border border-slate-200 p-4 space-y-2.5">
                        <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                          Campus News &amp; Student Editorial
                        </div>
                        <div className="h-3.5 w-4/5 rounded bg-slate-800/90" />
                        <div className="space-y-1.5 pt-1">
                          <div className="h-2.5 w-full rounded bg-slate-200" />
                          <div className="h-2.5 w-11/12 rounded bg-slate-200" />
                          <div className="h-2.5 w-9/12 rounded bg-slate-200" />
                        </div>
                      </div>

                      {/* Sponsored Placement Slot Beneath Article */}
                      <div className="mt-3.5 rounded-lg border border-blue-200 bg-blue-50/70 p-4 space-y-2">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-[11px] font-bold uppercase tracking-wider text-blue-800">
                            Sponsored Advertisement
                          </span>
                          <span className="text-[11px] font-medium text-slate-600">
                            Beneath Article
                          </span>
                        </div>
                        <p className="text-sm font-semibold text-slate-900">
                          Dedicated Corporate Placement Slot
                        </p>
                        <p className="text-xs text-slate-600 leading-relaxed">
                          Displayed directly beneath School Blog articles once your
                          company application and creative materials are approved.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            {/* How It Works Section */}
            <section
              id="how-it-works"
              className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-20"
            >
              <div className="max-w-2xl space-y-3 mb-10 sm:mb-12">
                <p className="text-xs sm:text-sm font-semibold uppercase tracking-[0.14em] text-blue-700">
                  How It Works
                </p>
                <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-950">
                  A structured, approval-based path to campus visibility.
                </h2>
                <p className="text-sm sm:text-base text-slate-600 leading-relaxed">
                  Corporate advertising on Grobaax is subject to review and approval
                  so campus publications remain trustworthy for readers and
                  institutions.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5 sm:gap-6">
                {HOW_IT_WORKS_STEPS.map((item) => {
                  const Icon = item.icon;
                  return (
                    <div
                      key={item.step}
                      className="rounded-xl border border-slate-200 bg-white p-6 flex flex-col justify-between gap-4"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <span className="text-sm font-bold tracking-wider text-blue-700">
                          {item.step}
                        </span>
                        <div className="w-9 h-9 rounded-lg bg-slate-100 text-slate-700 flex items-center justify-center shrink-0">
                          <Icon className="w-4 h-4" />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <h3 className="text-lg font-bold text-slate-900 tracking-tight">
                          {item.title}
                        </h3>
                        <p className="text-sm text-slate-600 leading-relaxed">
                          {item.description}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>

            {/* Placement Standard & CTA Band */}
            <section
              id="placement"
              className="border-t border-slate-200 bg-white"
            >
              <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-14 sm:py-16">
                <div className="rounded-xl border border-slate-200 bg-slate-900 text-white p-7 sm:p-10 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-8">
                  <div className="space-y-3 max-w-2xl">
                    <p className="text-xs font-semibold uppercase tracking-[0.14em] text-blue-300">
                      Editorial &amp; Advertiser Standards
                    </p>
                    <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">
                      Built for clear brand visibility without disrupting student
                      reading.
                    </h2>
                    <p className="text-sm sm:text-base text-slate-300 leading-relaxed">
                      Every placement sits cleanly beneath participating School Blog
                      articles. Advertising access requires formal company
                      application review and material approval before any plan
                      subscription or campaign activation.
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-3 shrink-0">
                    <a
                      href={CORPORATE_APPLY_URL}
                      onClick={(e) => handlePortalLinkClick(e, 'apply', '/apply')}
                      className="inline-flex items-center gap-2 px-5 py-3 text-sm font-semibold text-slate-950 bg-white hover:bg-slate-100 rounded-lg transition-colors whitespace-nowrap shrink-0"
                    >
                      Apply to Advertise
                      <ArrowRight className="w-4 h-4" />
                    </a>
                    <a
                      href={CORPORATE_LOGIN_URL}
                      onClick={(e) => handlePortalLinkClick(e, 'login', '/login')}
                      className="inline-flex items-center gap-2 px-5 py-3 text-sm font-semibold text-white bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg transition-colors whitespace-nowrap shrink-0"
                    >
                      Company Login
                    </a>
                  </div>
                </div>
              </div>
            </section>
          </>
        )}

        {route === 'apply' && (
          <section className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-24">
            <div className="rounded-xl border border-slate-200 bg-white p-7 sm:p-10 space-y-6">
              <div className="w-11 h-11 rounded-lg bg-blue-50 text-blue-700 border border-blue-200 flex items-center justify-center">
                <Clock className="w-5 h-5" />
              </div>

              <div className="space-y-3">
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-blue-700">
                  Grobaax Corporate Advertising · /apply
                </p>
                <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-950">
                  Company Application Portal Coming Soon
                </h1>
                <p className="text-sm sm:text-base text-slate-600 leading-relaxed">
                  The online corporate advertiser application portal is currently
                  being prepared. Businesses applying to advertise beneath
                  participating Grobaax School Blog articles will submit their
                  company profile and creative materials here for review and
                  approval.
                </p>
              </div>

              <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-xs sm:text-sm text-slate-600 leading-relaxed">
                All corporate advertising accounts, materials, and placements are
                subject to Grobaax approval prior to plan subscription and display.
              </div>

              <div className="pt-2 flex flex-wrap items-center gap-3">
                <a
                  href={`${CORPORATE_PORTAL_ORIGIN}/`}
                  onClick={(e) => handlePortalLinkClick(e, 'landing', '/')}
                  className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg transition-colors whitespace-nowrap shrink-0"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Back to Corporate Overview
                </a>
                <a
                  href={CORPORATE_LOGIN_URL}
                  onClick={(e) => handlePortalLinkClick(e, 'login', '/login')}
                  className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-300 rounded-lg transition-colors whitespace-nowrap shrink-0"
                >
                  Company Login
                </a>
              </div>
            </div>
          </section>
        )}

        {route === 'login' && (
          <section className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-24">
            <div className="rounded-xl border border-slate-200 bg-white p-7 sm:p-10 space-y-6">
              <div className="w-11 h-11 rounded-lg bg-slate-100 text-slate-800 border border-slate-200 flex items-center justify-center">
                <Building2 className="w-5 h-5" />
              </div>

              <div className="space-y-3">
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-blue-700">
                  Grobaax Corporate Advertising · /login
                </p>
                <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-950">
                  Company Account Login Coming Soon
                </h1>
                <p className="text-sm sm:text-base text-slate-600 leading-relaxed">
                  Corporate advertiser authentication is coming soon. Once the
                  company portal opens, approved businesses will sign in here on{' '}
                  <span className="font-medium text-slate-900">
                    advertise.grobaax.com
                  </span>{' '}
                  to manage corporate advertising plans and approved School Blog
                  placements.
                </p>
              </div>

              <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-xs sm:text-sm text-slate-600 leading-relaxed">
                This portal is dedicated strictly to corporate advertisers and is
                separate from Grobaax student scholar accounts.
              </div>

              <div className="pt-2 flex flex-wrap items-center gap-3">
                <a
                  href={`${CORPORATE_PORTAL_ORIGIN}/`}
                  onClick={(e) => handlePortalLinkClick(e, 'landing', '/')}
                  className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg transition-colors whitespace-nowrap shrink-0"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Back to Corporate Overview
                </a>
                <a
                  href={CORPORATE_APPLY_URL}
                  onClick={(e) => handlePortalLinkClick(e, 'apply', '/apply')}
                  className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-300 rounded-lg transition-colors whitespace-nowrap shrink-0"
                >
                  Apply to Advertise
                </a>
              </div>
            </div>
          </section>
        )}
      </main>

      {/* Quiet Corporate Footer */}
      <footer className="border-t border-slate-200 bg-white">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 text-xs sm:text-sm text-slate-500">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <span className="font-semibold text-slate-800">
              Grobaax Corporate Advertising
            </span>
            <span>·</span>
            <span>advertise.grobaax.com</span>
          </div>
          <div className="flex flex-wrap items-center gap-5">
            <a
              href={CORPORATE_APPLY_URL}
              onClick={(e) => handlePortalLinkClick(e, 'apply', '/apply')}
              className="hover:text-slate-900 transition-colors"
            >
              Apply to Advertise
            </a>
            <a
              href={CORPORATE_LOGIN_URL}
              onClick={(e) => handlePortalLinkClick(e, 'login', '/login')}
              className="hover:text-slate-900 transition-colors"
            >
              Company Login
            </a>
            <span>&copy; 2026 Grobaax Limited</span>
          </div>
        </div>
      </footer>
    </div>
  );
};
