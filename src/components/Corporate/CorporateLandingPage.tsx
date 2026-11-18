import React, { useEffect, useState } from 'react';
import {
  ArrowRight,
  BarChart3,
  CheckCircle2,
  ChevronDown,
  ClipboardCheck,
  CreditCard,
  ExternalLink,
  FileText,
  Mail,
  Megaphone,
  Menu,
  Rocket,
  ShieldCheck,
  Target,
  Users,
  X,
} from 'lucide-react';
import {
  CORPORATE_APPLY_URL,
  CORPORATE_DASHBOARD_URL,
  CORPORATE_LOGIN_URL,
  CORPORATE_PORTAL_ORIGIN,
  CorporatePortalRoute,
} from '../../utils/domainPortal';
import {
  CorporateAccount,
  CorporatePlan,
  fetchPublicCorporatePlans,
} from '../../lib/corporateAdsService';

interface CorporateLandingPageProps {
  onNavigate: (
    event: React.MouseEvent<HTMLAnchorElement>,
    targetRoute: CorporatePortalRoute,
    targetPath: '/' | '/apply' | '/login' | '/dashboard'
  ) => void;
  activeCompany: CorporateAccount | null;
}

const BENEFITS = [
  {
    title: 'Massive Reach',
    description: 'Connect with thousands of students across participating institutions.',
    icon: Users,
    badgeBg: 'bg-violet-100 text-violet-600',
  },
  {
    title: 'Targeted Audience',
    description: 'Reach engaged university, polytechnic, and college readers directly.',
    icon: Target,
    badgeBg: 'bg-emerald-100 text-emerald-600',
  },
  {
    title: 'Trusted Platform',
    description: 'Advertise in an Admin-moderated, academically verified publication space.',
    icon: ShieldCheck,
    badgeBg: 'bg-amber-100 text-amber-600',
  },
  {
    title: 'Track Performance',
    description: 'Measure real impressions, clicks, and CTR for every active campaign.',
    icon: BarChart3,
    badgeBg: 'bg-blue-100 text-blue-600',
  },
] as const;

const STEPS = [
  {
    step: 1,
    title: 'Submit Your Application',
    icon: FileText,
    badgeColor: 'bg-blue-600',
    iconColor: 'text-blue-600 bg-blue-50',
  },
  {
    step: 2,
    title: 'Get Approved',
    icon: ClipboardCheck,
    badgeColor: 'bg-violet-600',
    iconColor: 'text-violet-600 bg-violet-50',
  },
  {
    step: 3,
    title: 'Subscribe to a Plan',
    icon: CreditCard,
    badgeColor: 'bg-emerald-600',
    iconColor: 'text-emerald-600 bg-emerald-50',
  },
  {
    step: 4,
    title: 'Launch Your Campaign',
    icon: Rocket,
    badgeColor: 'bg-amber-500',
    iconColor: 'text-amber-600 bg-amber-50',
  },
] as const;

const FAQ_ITEMS = [
  {
    question: 'Who can apply to advertise on Grobaax?',
    answer:
      'Registered companies, financial institutions, telecom operators, edtech platforms, and consumer brands can submit a corporate advertiser application with official business contact details and optional verification documents.',
  },
  {
    question: 'How does approval work before launching ads?',
    answer:
      'Every company application and every submitted advertisement creative is reviewed by Grobaax Administrators. Once your company status is Approved, you can subscribe to an active plan via Paystack and submit ad campaigns for review.',
  },
  {
    question: 'Where do Corporate Advertisements appear for students?',
    answer:
      'Approved and Active campaigns appear in clearly labeled "Sponsored" placement cards beneath published School Blog articles and (on Sponsor Ticker-enabled plans) in the scrolling Sponsor Ticker bar across student views.',
  },
  {
    question: 'How are advertising subscriptions billed and verified?',
    answer:
      'All plan subscriptions are priced by Grobaax Administrators in NGN and processed securely through Paystack. Your billing history, invoice references, and payment receipts are accessible inside your Corporate Dashboard.',
  },
  {
    question: 'Can companies track campaign impressions and clicks?',
    answer:
      'Yes. Deduplicated impressions, clicks, click-through rate (CTR), start/expiry dates, and review statuses are tracked on our backend and reported per campaign inside your Corporate Dashboard.',
  },
] as const;

const TESTIMONIALS = [
  {
    quote:
      'Grobaax has given us strong visibility among verified students across campuses. Our brand reaches the right audience.',
    author: 'Corporate Partner',
  },
  {
    quote:
      'The School Blog sponsored placement sits cleanly below articles and drives consistent, measurable brand clicks.',
    author: 'Corporate Partner',
  },
  {
    quote:
      'Straightforward approval, transparent campaign metrics, and reliable placement across student newsrooms.',
    author: 'Corporate Partner',
  },
] as const;

export const CorporateLandingPage: React.FC<CorporateLandingPageProps> = ({
  onNavigate,
  activeCompany,
}) => {
  const [plans, setPlans] = useState<CorporatePlan[]>([]);
  const [plansLoading, setPlansLoading] = useState(true);
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(0);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [showPlansPanel, setShowPlansPanel] = useState(false);

  useEffect(() => {
    let mounted = true;
    fetchPublicCorporatePlans()
      .then((res) => {
        if (mounted && res.success) {
          setPlans(res.plans);
          if (res.plans.length > 0) setShowPlansPanel(true);
        }
      })
      .finally(() => {
        if (mounted) setPlansLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, []);

  const scrollToSection = (id: string) => {
    setMobileMenuOpen(false);
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#f4f7fe] text-[#0f172a] antialiased selection:bg-blue-700 selection:text-white">
      {/* Compact SaaS Top Navbar */}
      <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-slate-200/70">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-6">
          <a
            href={`${CORPORATE_PORTAL_ORIGIN}/`}
            onClick={(e) => onNavigate(e, 'landing', '/')}
            className="inline-flex items-center gap-2.5 text-sm sm:text-base font-bold tracking-tight text-slate-900 whitespace-nowrap shrink-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 rounded"
          >
            <img
              src="/assets/aistudio/img_1_1794948944738_4ef63eec.jpg"
              alt="Grobaax Logo"
              referrerPolicy="no-referrer"
              className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl object-cover shrink-0 shadow-xs"
            />
            <span>Grobaax Corporate Advertising</span>
          </a>

          <nav
            aria-label="Corporate portal navigation"
            className="hidden lg:flex items-center gap-6 text-sm font-medium text-slate-600"
          >
            <button
              type="button"
              onClick={() => scrollToSection('home')}
              className="px-3.5 py-1.5 rounded-full bg-blue-600 text-white font-semibold text-xs whitespace-nowrap shrink-0 cursor-pointer"
            >
              Home
            </button>
            <button
              type="button"
              onClick={() => {
                setShowPlansPanel(true);
                scrollToSection('plans');
              }}
              className="hover:text-blue-600 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              Advertising Plans
            </button>
            <button
              type="button"
              onClick={() => scrollToSection('for-businesses')}
              className="hover:text-blue-600 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              For Businesses
            </button>
            <button
              type="button"
              onClick={() => scrollToSection('faq')}
              className="hover:text-blue-600 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              FAQ
            </button>
            <button
              type="button"
              onClick={() => scrollToSection('contact')}
              className="hover:text-blue-600 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              Contact
            </button>
          </nav>

          <div className="hidden sm:flex items-center gap-2.5 shrink-0">
            {activeCompany ? (
              <a
                href={CORPORATE_DASHBOARD_URL}
                onClick={(e) => onNavigate(e, 'dashboard', '/dashboard')}
                className="px-4 py-2 rounded-full bg-blue-600 hover:bg-blue-700 text-white text-xs sm:text-sm font-semibold transition-colors whitespace-nowrap shrink-0 inline-flex items-center gap-1.5 shadow-sm"
              >
                <span>Open Dashboard</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </a>
            ) : (
              <>
                <a
                  href={CORPORATE_LOGIN_URL}
                  onClick={(e) => onNavigate(e, 'login', '/login')}
                  className="px-4 py-2 rounded-full border border-blue-200 bg-white hover:bg-blue-50 text-blue-700 text-xs sm:text-sm font-semibold transition-colors whitespace-nowrap shrink-0"
                >
                  Company Login
                </a>
                <a
                  href={CORPORATE_APPLY_URL}
                  onClick={(e) => onNavigate(e, 'apply', '/apply')}
                  className="px-4 py-2 rounded-full bg-blue-600 hover:bg-blue-700 text-white text-xs sm:text-sm font-semibold transition-colors whitespace-nowrap shrink-0 shadow-sm"
                >
                  Apply to Advertise
                </a>
              </>
            )}
          </div>

          <button
            type="button"
            onClick={() => setMobileMenuOpen((v) => !v)}
            aria-label="Toggle navigation menu"
            className="lg:hidden p-2 rounded-xl border border-slate-200 bg-white text-slate-700 cursor-pointer"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>

        {/* Mobile Drawer */}
        {mobileMenuOpen && (
          <div className="lg:hidden border-t border-slate-200 bg-white px-4 py-4 space-y-3 shadow-lg">
            <div className="grid grid-cols-2 gap-2 text-sm font-medium text-slate-700">
              <button
                type="button"
                onClick={() => scrollToSection('home')}
                className="px-3 py-2.5 rounded-xl bg-blue-50 text-blue-700 font-semibold text-left cursor-pointer"
              >
                Home
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowPlansPanel(true);
                  scrollToSection('plans');
                }}
                className="px-3 py-2.5 rounded-xl hover:bg-slate-50 text-left cursor-pointer"
              >
                Advertising Plans
              </button>
              <button
                type="button"
                onClick={() => scrollToSection('for-businesses')}
                className="px-3 py-2.5 rounded-xl hover:bg-slate-50 text-left cursor-pointer"
              >
                For Businesses
              </button>
              <button
                type="button"
                onClick={() => scrollToSection('faq')}
                className="px-3 py-2.5 rounded-xl hover:bg-slate-50 text-left cursor-pointer"
              >
                FAQ
              </button>
              <button
                type="button"
                onClick={() => scrollToSection('contact')}
                className="px-3 py-2.5 rounded-xl hover:bg-slate-50 text-left col-span-2 cursor-pointer"
              >
                Contact
              </button>
            </div>

            <div className="pt-2 flex flex-col gap-2 border-t border-slate-100">
              {activeCompany ? (
                <a
                  href={CORPORATE_DASHBOARD_URL}
                  onClick={(e) => {
                    setMobileMenuOpen(false);
                    onNavigate(e, 'dashboard', '/dashboard');
                  }}
                  className="w-full py-2.5 rounded-full bg-blue-600 text-white text-sm font-semibold text-center"
                >
                  Open Company Dashboard
                </a>
              ) : (
                <>
                  <a
                    href={CORPORATE_APPLY_URL}
                    onClick={(e) => {
                      setMobileMenuOpen(false);
                      onNavigate(e, 'apply', '/apply');
                    }}
                    className="w-full py-2.5 rounded-full bg-blue-600 text-white text-sm font-semibold text-center"
                  >
                    Apply to Advertise
                  </a>
                  <a
                    href={CORPORATE_LOGIN_URL}
                    onClick={(e) => {
                      setMobileMenuOpen(false);
                      onNavigate(e, 'login', '/login');
                    }}
                    className="w-full py-2.5 rounded-full border border-slate-200 bg-white text-slate-800 text-sm font-semibold text-center"
                  >
                    Company Login
                  </a>
                </>
              )}
            </div>
          </div>
        )}
      </header>

      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-8 sm:space-y-10">
        {/* Hero Card — Clean Blue Gradient + Gold CTA + Sleek SaaS Graphic */}
        <section
          id="home"
          className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#1d4ed8] via-[#2563eb] to-[#4f46e5] text-white p-6 sm:p-10 lg:p-12 shadow-xl shadow-blue-900/15"
        >
          <div className="pointer-events-none absolute -top-20 -right-16 w-72 h-72 rounded-full bg-indigo-400/25 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-24 left-1/3 w-80 h-80 rounded-full bg-blue-300/20 blur-3xl" />

          <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 items-center">
            <div className="lg:col-span-7 space-y-5">
              <div className="inline-flex items-center px-3.5 py-1 rounded-full bg-white/15 backdrop-blur-sm border border-white/20 text-xs font-semibold tracking-wide text-blue-50">
                Grobaax Corporate Advertising
              </div>

              <h1 className="text-3xl sm:text-5xl lg:text-[52px] font-extrabold tracking-tight leading-[1.08] text-balance">
                Advertise Your Brand{' '}
                <span className="block">
                  on <span className="text-[#facc15]">Grobaax</span>
                </span>
              </h1>

              <p className="text-sm sm:text-base lg:text-lg text-blue-100/95 leading-relaxed max-w-xl">
                Reach thousands of students across participating institutions through
                sponsored School Blog advertisements.
              </p>

              <div className="pt-2 flex flex-wrap items-center gap-3.5">
                {activeCompany ? (
                  <a
                    href={CORPORATE_DASHBOARD_URL}
                    onClick={(e) => onNavigate(e, 'dashboard', '/dashboard')}
                    className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-[#facc15] hover:bg-[#fde047] text-slate-950 font-bold text-sm sm:text-base transition-transform hover:-translate-y-0.5 shadow-lg shadow-amber-950/20 whitespace-nowrap"
                  >
                    <span>Go to Company Dashboard</span>
                    <ArrowRight className="w-4 h-4" />
                  </a>
                ) : (
                  <>
                    <a
                      href={CORPORATE_APPLY_URL}
                      onClick={(e) => onNavigate(e, 'apply', '/apply')}
                      className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-[#facc15] hover:bg-[#fde047] text-slate-950 font-bold text-sm sm:text-base transition-transform hover:-translate-y-0.5 shadow-lg shadow-amber-950/20 whitespace-nowrap"
                    >
                      <span>Apply to Advertise</span>
                      <ArrowRight className="w-4 h-4" />
                    </a>
                    <a
                      href={CORPORATE_LOGIN_URL}
                      onClick={(e) => onNavigate(e, 'login', '/login')}
                      className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-white/10 hover:bg-white/20 border border-white/35 text-white font-semibold text-sm sm:text-base transition-colors whitespace-nowrap"
                    >
                      <span>Company Login</span>
                      <ArrowRight className="w-4 h-4" />
                    </a>
                  </>
                )}
              </div>
            </div>

            {/* Crisp SaaS Illustration Card (Smartphone Sponsored Article + Megaphone) */}
            <div className="lg:col-span-5 flex justify-center lg:justify-end">
              <div className="relative w-full max-w-[330px]">
                <div className="rounded-[28px] bg-white/15 backdrop-blur-md border border-white/25 p-4 shadow-2xl">
                  <div className="rounded-2xl bg-white text-slate-900 p-4 space-y-3 shadow-inner">
                    <div className="flex items-center justify-between text-[11px] font-semibold text-slate-400">
                      <span>Campus School Blog</span>
                      <span className="text-blue-600 font-bold">Sponsored Slot</span>
                    </div>

                    <div className="rounded-xl bg-gradient-to-br from-blue-50 to-indigo-100 border border-blue-100 p-4 flex items-center justify-center">
                      <svg
                        viewBox="0 0 180 110"
                        className="w-40 h-24"
                        aria-hidden="true"
                      >
                        <rect
                          x="14"
                          y="14"
                          width="106"
                          height="82"
                          rx="12"
                          fill="#ffffff"
                          stroke="#dbeafe"
                          strokeWidth="2"
                        />
                        <rect x="26" y="26" width="54" height="30" rx="6" fill="#3b82f6" fillOpacity="0.16" />
                        <circle cx="40" cy="37" r="5" fill="#2563eb" />
                        <path d="M29 52 L44 40 L54 47 L63 42 L76 52 Z" fill="#60a5fa" />
                        <rect x="26" y="64" width="76" height="6" rx="3" fill="#cbd5e1" />
                        <rect x="26" y="75" width="56" height="6" rx="3" fill="#e2e8f0" />
                        <g transform="translate(96, 36) rotate(-14)">
                          <path
                            d="M12 18 L52 4 L52 44 L12 30 Z"
                            fill="#facc15"
                            stroke="#eab308"
                            strokeWidth="2"
                            strokeLinejoin="round"
                          />
                          <rect x="4" y="18" width="12" height="12" rx="4" fill="#1d4ed8" />
                          <rect x="14" y="29" width="7" height="16" rx="3" fill="#1e3a8a" />
                          <path d="M58 14 L68 9" stroke="#facc15" strokeWidth="3.5" strokeLinecap="round" />
                          <path d="M60 25 L72 25" stroke="#fde047" strokeWidth="3.5" strokeLinecap="round" />
                          <path d="M58 36 L68 41" stroke="#facc15" strokeWidth="3.5" strokeLinecap="round" />
                        </g>
                      </svg>
                    </div>

                    <div className="space-y-1.5">
                      <div className="text-xs font-bold text-slate-900">
                        Verified Brand Promotion
                      </div>
                      <p className="text-[11px] text-slate-500 leading-relaxed">
                        Appears beneath full student articles across approved institutions.
                      </p>
                    </div>

                    <div className="pt-1 flex items-center justify-between text-[11px] font-semibold">
                      <span className="text-slate-500">Tracked Analytics</span>
                      <span className="px-2.5 py-1 rounded-full bg-blue-600 text-white">
                        Learn More
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* 4 Core Benefits Row */}
        <section aria-label="Advertising benefits" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
          {BENEFITS.map((item) => {
            const Icon = item.icon;
            return (
              <div
                key={item.title}
                className="rounded-2xl bg-white border border-slate-200/80 p-5 shadow-sm shadow-slate-200/60 flex items-start gap-3.5"
              >
                <div
                  className={`w-11 h-11 rounded-full flex items-center justify-center shrink-0 ${item.badgeBg}`}
                >
                  <Icon className="w-5 h-5" />
                </div>
                <div className="space-y-1 min-w-0">
                  <h2 className="text-sm sm:text-base font-bold text-slate-900 tracking-tight">
                    {item.title}
                  </h2>
                  <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                    {item.description}
                  </p>
                </div>
              </div>
            );
          })}
        </section>

        {/* How It Works — 4-Step SaaS Flow */}
        <section
          id="how-it-works"
          className="rounded-3xl bg-white border border-slate-200/80 p-6 sm:p-8 lg:p-10 shadow-sm shadow-slate-200/60"
        >
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            <div className="lg:col-span-4 space-y-4 lg:pr-6 lg:border-r lg:border-slate-100">
              <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
                How It Works
              </h2>
              <p className="text-sm sm:text-base text-slate-600 leading-relaxed">
                Getting started is structured and transparent. Follow four simple steps
                to advertise on Grobaax.
              </p>
              <a
                href={activeCompany ? CORPORATE_DASHBOARD_URL : CORPORATE_APPLY_URL}
                onClick={(e) =>
                  onNavigate(
                    e,
                    activeCompany ? 'dashboard' : 'apply',
                    activeCompany ? '/dashboard' : '/apply'
                  )
                }
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold transition-colors whitespace-nowrap shadow-sm"
              >
                <span>Get Started Today</span>
                <ArrowRight className="w-4 h-4" />
              </a>
            </div>

            <div className="lg:col-span-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
              {STEPS.map((s) => {
                const Icon = s.icon;
                return (
                  <div
                    key={s.step}
                    className="relative rounded-2xl bg-[#f8faff] border border-slate-200/70 p-4 pt-6 flex flex-col items-center text-center gap-3"
                  >
                    <span
                      className={`-mt-9 w-7 h-7 rounded-full ${s.badgeColor} text-white text-xs font-bold flex items-center justify-center shadow-sm tabular-nums`}
                    >
                      {s.step}
                    </span>
                    <div
                      className={`w-11 h-11 rounded-xl flex items-center justify-center ${s.iconColor}`}
                    >
                      <Icon className="w-5 h-5" />
                    </div>
                    <h3 className="text-xs sm:text-sm font-bold text-slate-900 leading-snug">
                      {s.title}
                    </h3>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* Flexible Advertising Plans Banner + Live Admin-Configured Plans */}
        <section id="plans" className="space-y-5">
          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-[#2563eb] via-[#3b82f6] to-[#6366f1] text-white p-6 sm:p-9 shadow-lg shadow-blue-900/10">
            <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div className="space-y-2 max-w-xl">
                <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
                  Flexible Advertising Plans
                </h2>
                <p className="text-sm sm:text-base text-blue-50/95">
                  Choose an Admin-approved package configured for your campaign duration
                  and concurrent sponsorship needs.
                </p>
                <div className="pt-2 flex flex-wrap items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setShowPlansPanel((v) => !v)}
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-[#0f172a] hover:bg-slate-900 text-white text-sm font-semibold transition-colors cursor-pointer whitespace-nowrap"
                  >
                    <span>{showPlansPanel ? 'Hide Plan Details' : 'View Plans'}</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                  {!activeCompany && (
                    <a
                      href={CORPORATE_APPLY_URL}
                      onClick={(e) => onNavigate(e, 'apply', '/apply')}
                      className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-full bg-white/15 hover:bg-white/25 text-white text-sm font-semibold transition-colors whitespace-nowrap"
                    >
                      Apply First
                    </a>
                  )}
                </div>
              </div>

              <div className="hidden md:flex items-center gap-3">
                <div className="w-28 h-24 rounded-2xl bg-white/15 border border-white/25 backdrop-blur-sm p-3 flex flex-col justify-between">
                  <div className="w-6 h-6 rounded-full bg-amber-300/90 flex items-center justify-center text-slate-900 text-xs font-black">
                    ₦
                  </div>
                  <div className="space-y-1">
                    <div className="h-2 w-16 rounded bg-white/70" />
                    <div className="h-1.5 w-12 rounded bg-white/40" />
                  </div>
                </div>
                <div className="w-28 h-24 rounded-2xl bg-white/20 border border-white/30 backdrop-blur-sm p-3 flex flex-col justify-between -mt-3">
                  <Megaphone className="w-5 h-5 text-[#facc15]" />
                  <div className="space-y-1">
                    <div className="h-2 w-18 rounded bg-white/85" />
                    <div className="h-1.5 w-10 rounded bg-white/50" />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {showPlansPanel && (
            <div className="rounded-3xl bg-white border border-slate-200/80 p-6 sm:p-8 shadow-sm">
              {plansLoading ? (
                <div className="py-8 text-center text-sm font-medium text-slate-500">
                  Loading available advertising plans...
                </div>
              ) : plans.length === 0 ? (
                <div className="py-6 text-center space-y-3 max-w-lg mx-auto">
                  <h3 className="text-base font-bold text-slate-900">
                    Advertising Plans Managed by Grobaax Admin
                  </h3>
                  <p className="text-sm text-slate-600 leading-relaxed">
                    Subscription packages and campaign quotas are configured directly by
                    Grobaax Administrators. Submit your company application now to access
                    plan checkout once your company is approved.
                  </p>
                  <a
                    href={CORPORATE_APPLY_URL}
                    onClick={(e) => onNavigate(e, 'apply', '/apply')}
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold transition-colors"
                  >
                    Apply to Advertise
                    <ArrowRight className="w-4 h-4" />
                  </a>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                  {plans.map((plan) => (
                    <div
                      key={plan.id}
                      className="rounded-2xl border border-slate-200 bg-[#f8faff] p-6 flex flex-col justify-between gap-5"
                    >
                      <div className="space-y-3">
                        <div className="flex items-center justify-between gap-2">
                          <h3 className="text-lg font-extrabold text-slate-900">
                            {plan.name}
                          </h3>
                          <span className="text-xs font-semibold text-blue-700 tabular-nums">
                            {plan.durationDays} days
                          </span>
                        </div>
                        <div className="text-3xl font-extrabold text-blue-700 tabular-nums">
                          ₦{Number(plan.monthlyPriceNaira).toLocaleString()}
                          <span className="text-xs font-medium text-slate-500">
                            {' '}
                            / billing cycle
                          </span>
                        </div>
                        {plan.description && (
                          <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                            {plan.description}
                          </p>
                        )}
                        <div className="pt-2 border-t border-slate-200/80 space-y-2 text-xs sm:text-sm text-slate-700">
                          <div className="flex items-center gap-2">
                            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                            <span>
                              Up to{' '}
                              <strong className="tabular-nums">
                                {plan.maxActiveCampaigns}
                              </strong>{' '}
                              active campaign(s)
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                            <span>
                              Up to{' '}
                              <strong className="tabular-nums">
                                {plan.campaignDurationDays}
                              </strong>{' '}
                              days per campaign
                            </span>
                          </div>
                          {plan.sponsorTickerMode && plan.sponsorTickerMode !== 'none' && (
                            <div className="flex items-center gap-2">
                              <CheckCircle2 className="w-4 h-4 text-blue-600 shrink-0" />
                              <span>
                                Sponsor Ticker:{' '}
                                <strong>
                                  {plan.sponsorTickerMode === 'optional_upgrade'
                                    ? `Optional Add-on (+₦${Number(
                                        plan.tickerUpgradePriceNaira || 0
                                      ).toLocaleString()})`
                                    : `${plan.maxTickerCampaigns || 1} active ticker ad${
                                        (plan.maxTickerCampaigns || 1) > 1 ? 's' : ''
                                      }`}
                                </strong>
                              </span>
                            </div>
                          )}
                          {plan.features.map((feat, idx) => (
                            <div key={idx} className="flex items-center gap-2">
                              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                              <span>{feat}</span>
                            </div>
                          ))}
                        </div>
                      </div>

                      <a
                        href={activeCompany ? CORPORATE_DASHBOARD_URL : CORPORATE_APPLY_URL}
                        onClick={(e) =>
                          onNavigate(
                            e,
                            activeCompany ? 'dashboard' : 'apply',
                            activeCompany ? '/dashboard' : '/apply'
                          )
                        }
                        className="w-full py-2.5 px-4 rounded-full bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold text-center transition-colors"
                      >
                        {activeCompany ? 'Subscribe in Dashboard' : 'Apply for This Plan'}
                      </a>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </section>

        {/* For Businesses + School Blog Sponsored Placement Example */}
        <section
          id="for-businesses"
          className="rounded-3xl bg-white border border-slate-200/80 p-6 sm:p-8 lg:p-10 shadow-sm"
        >
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            <div className="lg:col-span-6 space-y-4">
              <p className="text-xs font-bold uppercase tracking-wider text-blue-600">
                For Businesses &amp; Institutions
              </p>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
                Built for Serious Brands Reaching Students
              </h2>
              <p className="text-sm sm:text-base text-slate-600 leading-relaxed">
                Banks, telecom operators, fintech platforms, scholarship foundations, and
                educational brands use Grobaax Corporate Advertising to place approved
                campaigns directly beneath participating School Blog publications.
              </p>
              <ul className="space-y-2.5 text-sm text-slate-700 pt-1">
                <li className="flex items-center gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-blue-600 shrink-0" />
                  <span>Full company vetting and creative review by Grobaax Admin</span>
                </li>
                <li className="flex items-center gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-blue-600 shrink-0" />
                  <span>Non-intrusive placement strictly after full School Blog articles</span>
                </li>
                <li className="flex items-center gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-blue-600 shrink-0" />
                  <span>Fair campaign rotation with verified impressions, clicks, and CTR</span>
                </li>
              </ul>
            </div>

            <div className="lg:col-span-6">
              <div className="rounded-2xl border border-slate-200 bg-[#f8faff] p-5 space-y-4">
                <div className="flex items-center justify-between text-xs text-slate-500">
                  <span className="font-semibold text-slate-700">
                    School Blog Footer Placement Specimen
                  </span>
                  <span>After Article Body</span>
                </div>
                <div className="rounded-xl bg-white border border-slate-200 p-4 space-y-2">
                  <div className="h-2.5 w-2/3 rounded bg-slate-200" />
                  <div className="h-2.5 w-full rounded bg-slate-100" />
                  <div className="h-2.5 w-5/6 rounded bg-slate-100" />
                </div>
                <div className="rounded-xl bg-white border border-blue-200 p-4 space-y-2.5 shadow-xs">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="font-bold uppercase tracking-wider text-blue-700">
                      Sponsored · Brand Name
                    </span>
                    <span className="text-slate-400">Approved Placement</span>
                  </div>
                  <div className="text-sm font-bold text-slate-900">
                    Campaign Headline Shown Here
                  </div>
                  <p className="text-xs text-slate-600">
                    Your concise corporate message, creative banner, and tracked call-to-action
                    link appear cleanly beneath the article.
                  </p>
                  <div className="pt-1">
                    <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-blue-600 text-white text-xs font-semibold">
                      <span>Visit Offer</span>
                      <ExternalLink className="w-3 h-3" />
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Testimonials — What Our Advertisers Say */}
        <section className="space-y-6">
          <div className="text-center space-y-1.5">
            <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              What Our Advertisers Say
            </h2>
            <div className="w-16 h-1 bg-blue-600 rounded-full mx-auto" />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-5">
            {TESTIMONIALS.map((t, i) => (
              <div
                key={i}
                className="rounded-2xl bg-white border border-slate-200/80 p-5 shadow-sm flex flex-col justify-between gap-4"
              >
                <div className="flex items-start gap-3">
                  <span
                    aria-hidden="true"
                    className="w-9 h-9 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center font-serif text-2xl font-bold shrink-0 leading-none"
                  >
                    &ldquo;
                  </span>
                  <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                    {t.quote}
                  </p>
                </div>
                <p className="text-xs font-bold text-slate-900 pl-12">
                  &mdash; {t.author}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* Interactive FAQ Section */}
        <section
          id="faq"
          className="rounded-3xl bg-white border border-slate-200/80 p-6 sm:p-8 lg:p-10 shadow-sm space-y-6"
        >
          <div className="max-w-2xl space-y-1.5">
            <p className="text-xs font-bold uppercase tracking-wider text-blue-600">FAQ</p>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              Frequently Asked Questions
            </h2>
          </div>

          <div className="divide-y divide-slate-200 border-t border-slate-200">
            {FAQ_ITEMS.map((item, idx) => {
              const isOpen = openFaqIndex === idx;
              return (
                <div key={idx} className="py-4">
                  <button
                    type="button"
                    onClick={() => setOpenFaqIndex(isOpen ? null : idx)}
                    className="w-full flex items-center justify-between gap-4 text-left font-bold text-sm sm:text-base text-slate-900 hover:text-blue-700 transition-colors cursor-pointer"
                  >
                    <span>{item.question}</span>
                    <ChevronDown
                      className={`w-5 h-5 text-slate-400 shrink-0 transition-transform ${
                        isOpen ? 'rotate-180 text-blue-600' : ''
                      }`}
                    />
                  </button>
                  {isOpen && (
                    <p className="mt-2.5 text-sm text-slate-600 leading-relaxed max-w-3xl">
                      {item.answer}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        </section>

        {/* Contact Section */}
        <section
          id="contact"
          className="rounded-3xl bg-white border border-slate-200/80 p-6 sm:p-8 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6"
        >
          <div className="space-y-1.5">
            <p className="text-xs font-bold uppercase tracking-wider text-blue-600">
              Corporate Desk
            </p>
            <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
              Need Assistance With Your Brand Campaign?
            </h2>
            <p className="text-sm text-slate-600">
              Reach our Corporate Partnerships desk at{' '}
              <a
                href="mailto:grobaxlimited@gmail.com"
                className="font-semibold text-blue-600 hover:underline"
              >
                grobaxlimited@gmail.com
              </a>{' '}
              or apply online to begin verification.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3 shrink-0">
            <a
              href="mailto:grobaxlimited@gmail.com"
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-full border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-800 text-sm font-semibold transition-colors whitespace-nowrap"
            >
              <Mail className="w-4 h-4 text-blue-600" />
              <span>Email Partnerships</span>
            </a>
            <a
              href={CORPORATE_APPLY_URL}
              onClick={(e) => onNavigate(e, 'apply', '/apply')}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold transition-colors whitespace-nowrap"
            >
              <span>Apply Online</span>
              <ArrowRight className="w-4 h-4" />
            </a>
          </div>
        </section>

        {/* Final Dark Navy CTA Strip */}
        <section className="rounded-3xl bg-[#0c1d52] text-white p-7 sm:p-10 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-center gap-4 sm:gap-5">
            <div className="hidden sm:flex w-14 h-14 rounded-2xl bg-white/10 border border-white/15 items-center justify-center shrink-0">
              <BarChart3 className="w-7 h-7 text-[#facc15]" />
            </div>
            <div className="space-y-1">
              <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
                Ready to Grow Your Brand?
              </h2>
              <p className="text-sm sm:text-base text-blue-100/90">
                Submit your company application to reach campus audiences across Grobaax.
              </p>
            </div>
          </div>

          <a
            href={activeCompany ? CORPORATE_DASHBOARD_URL : CORPORATE_APPLY_URL}
            onClick={(e) =>
              onNavigate(
                e,
                activeCompany ? 'dashboard' : 'apply',
                activeCompany ? '/dashboard' : '/apply'
              )
            }
            className="inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-full bg-[#facc15] hover:bg-[#fde047] text-slate-950 font-bold text-sm sm:text-base transition-transform hover:-translate-y-0.5 shrink-0 whitespace-nowrap"
          >
            <span>{activeCompany ? 'Open Dashboard' : 'Apply to Advertise'}</span>
            <ArrowRight className="w-4 h-4" />
          </a>
        </section>
      </main>

      {/* Clean Footer */}
      <footer className="bg-white border-t border-slate-200/80 mt-6">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs sm:text-sm text-slate-500">
          <div className="inline-flex items-center gap-2.5">
            <img
              src="/assets/aistudio/img_1_1794948944738_4ef63eec.jpg"
              alt="Grobaax Logo"
              referrerPolicy="no-referrer"
              className="w-6 h-6 rounded-lg object-cover shrink-0"
            />
            <p>&copy; 2026 Grobaax. All rights reserved.</p>
          </div>
          <div className="flex flex-wrap items-center gap-5">
            <button
              type="button"
              onClick={() => scrollToSection('home')}
              className="hover:text-slate-900 transition-colors cursor-pointer"
            >
              Home
            </button>
            <button
              type="button"
              onClick={() => {
                setShowPlansPanel(true);
                scrollToSection('plans');
              }}
              className="hover:text-slate-900 transition-colors cursor-pointer"
            >
              Advertising Plans
            </button>
            <button
              type="button"
              onClick={() => scrollToSection('for-businesses')}
              className="hover:text-slate-900 transition-colors cursor-pointer"
            >
              For Businesses
            </button>
            <button
              type="button"
              onClick={() => scrollToSection('faq')}
              className="hover:text-slate-900 transition-colors cursor-pointer"
            >
              FAQ
            </button>
            <button
              type="button"
              onClick={() => scrollToSection('contact')}
              className="hover:text-slate-900 transition-colors cursor-pointer"
            >
              Contact
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
};
