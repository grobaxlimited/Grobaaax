import React, { useState, useEffect } from 'react';
import {
  GraduationCap,
  ArrowRight,
  ArrowLeft,
  BookOpen,
  Trophy,
  Users,
  Coins,
  Calendar,
  Sparkles,
  ShoppingBag,
  FileText,
  Palette,
  Wrench,
  Smartphone,
  Wallet,
  CheckCircle2,
  ShieldCheck,
  Zap,
  Flame,
  ArrowUpRight,
} from 'lucide-react';
import { WelcomeVisual } from './visuals/WelcomeVisual';
import { SchoolDomeVisual } from './visuals/SchoolDomeVisual';
import { DailyGPGrabVisual } from './visuals/DailyGPGrabVisual';
import { CampusNetworkVisual } from './visuals/CampusNetworkVisual';
import { MiniMartVisual } from './visuals/MiniMartVisual';
import { GPRedemptionVisual } from './visuals/GPRedemptionVisual';

interface OnboardingFlowProps {
  onComplete: () => void;
  onGoToLogin: () => void;
  onGoToRegister: () => void;
}

export const OnboardingFlow: React.FC<OnboardingFlowProps> = ({
  onComplete,
  onGoToLogin,
  onGoToRegister,
}) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);

  const totalSteps = 6;

  const stepsMeta = [
    {
      id: 'welcome',
      shortTitle: 'Overview',
      stepNumber: 1,
      badge: 'PLATFORM OVERVIEW',
      title: 'Your School. Your Community. Your Growth.',
      highlightText: 'Your Community.',
      description:
        'GROBAAX is the premier academic network built specifically for Nigerian university, polytechnic, and college of education students. Learn, compete, connect, and earn — all in one unified ecosystem.',
      visual: <WelcomeVisual />,
      featureCards: [
        {
          icon: <BookOpen className="w-4 h-4 text-blue-400" />,
          title: 'Learn & Excel',
          text: 'Curated handouts, past questions & study notes.',
        },
        {
          icon: <Trophy className="w-4 h-4 text-amber-400" />,
          title: 'Compete Nationally',
          text: 'Inter-school academic elimination battles.',
        },
        {
          icon: <Users className="w-4 h-4 text-cyan-400" />,
          title: 'Connect Campus',
          text: 'Nationwide network across 100+ institutions.',
        },
        {
          icon: <Coins className="w-4 h-4 text-emerald-400" />,
          title: 'Earn GP Value',
          text: 'Redeem airtime, data & cash direct to bank.',
        },
      ],
    },
    {
      id: 'school-dome',
      shortTitle: 'School Dome',
      stepNumber: 2,
      badge: 'INTER-INSTITUTIONAL ARENA',
      title: 'School Dome: Represent Your School',
      highlightText: 'School Dome',
      tagline: 'Represent your school. Compete. Stay standing.',
      description:
        'A season-based academic arena where scholars represent their institutions in live elimination battles. The last scholar standing brings national pride to their school and claims substantial GP prize pools.',
      visual: <SchoolDomeVisual />,
      featureCards: [
        {
          icon: <Calendar className="w-4 h-4 text-amber-400" />,
          title: 'Every Sat & Sun',
          text: 'Live weekend tournament rounds with real-time timers.',
        },
        {
          icon: <Trophy className="w-4 h-4 text-yellow-400" />,
          title: 'Institutional Pride',
          text: 'Universities, Polytechnics & COEs battle for dominance.',
        },
        {
          icon: <Flame className="w-4 h-4 text-rose-400" />,
          title: 'Elimination Format',
          text: 'Answer accurately under pressure to remain standing.',
        },
        {
          icon: <Coins className="w-4 h-4 text-emerald-400" />,
          title: 'Prize GP Pools',
          text: 'Substantial GP rewards for victorious finalists.',
        },
      ],
    },
    {
      id: 'daily-gp',
      shortTitle: 'Daily GP Grab',
      stepNumber: 3,
      badge: 'INDIVIDUAL DAILY CHALLENGE',
      title: 'Daily GP Grab: Answer & Earn Daily',
      highlightText: 'Daily GP Grab',
      tagline: 'Answer. Earn GP. Repeat.',
      description:
        'Every Monday to Friday, take part in Daily GP Grab by answering quick academic questions. Correct answers earn you GP instantly into your wallet with guaranteed 1 GP = ₦1 valuation.',
      visual: <DailyGPGrabVisual />,
      featureCards: [
        {
          icon: <Calendar className="w-4 h-4 text-cyan-400" />,
          title: 'Monday – Friday',
          text: 'Daily question drops available in your scholar feed.',
        },
        {
          icon: <Zap className="w-4 h-4 text-amber-400" />,
          title: '15s Speed Rounds',
          text: 'Rapid-fire assessments designed to test sharp minds.',
        },
        {
          icon: <CheckCircle2 className="w-4 h-4 text-emerald-400" />,
          title: 'Instant GP Credit',
          text: 'Earn points immediately upon correct answer submission.',
        },
        {
          icon: <Coins className="w-4 h-4 text-blue-400" />,
          title: '1 GP = ₦1 Value',
          text: 'Full transparency with direct cashout & airtime options.',
        },
      ],
    },
    {
      id: 'campus',
      shortTitle: 'Campus Arena',
      stepNumber: 4,
      badge: 'INTER-INSTITUTIONAL NETWORK',
      title: 'Campus Arena: Connect Across 100+ Schools',
      highlightText: 'Campus Arena',
      tagline: 'Connect with students from your institution and beyond.',
      description:
        'Meet and interact with peers from your school and tertiary institutions nationwide. Build your academic network, exchange study notes, discuss campus topics, and stay connected with verified scholars.',
      visual: <CampusNetworkVisual />,
      featureCards: [
        {
          icon: <Users className="w-4 h-4 text-blue-400" />,
          title: 'Verified Scholar Hubs',
          text: 'Dedicated campus feeds for UNILAG, UNIBEN, ABU, FUTO & more.',
        },
        {
          icon: <GraduationCap className="w-4 h-4 text-cyan-400" />,
          title: 'Department Networks',
          text: 'Collaborate with scholars in your course across Nigeria.',
        },
        {
          icon: <Sparkles className="w-4 h-4 text-amber-400" />,
          title: 'Peer Discussion',
          text: 'Ask academic questions, share solutions, and study together.',
        },
        {
          icon: <ShieldCheck className="w-4 h-4 text-emerald-400" />,
          title: 'Safe Student Space',
          text: 'Strictly authenticated community designed for students.',
        },
      ],
    },
    {
      id: 'minimart',
      shortTitle: 'MiniMart',
      stepNumber: 5,
      badge: 'STUDENT MARKETPLACE',
      title: 'Campus MiniMart: Student Commerce Hub',
      highlightText: 'Campus MiniMart',
      tagline: 'Discover what students have to offer.',
      description:
        'A dedicated student-to-student marketplace. Buy and sell verified lecture handouts, offer freelance tech and creative skills, sell campus products, and provide student services with built-in escrow protection.',
      visual: <MiniMartVisual />,
      featureCards: [
        {
          icon: <FileText className="w-4 h-4 text-blue-400" />,
          title: 'Academic Handouts',
          text: 'Monetize verified lecture notes, summaries & past papers.',
        },
        {
          icon: <Palette className="w-4 h-4 text-purple-400" />,
          title: 'Freelance Skills',
          text: 'Hire student graphic designers, coders, writers & tutors.',
        },
        {
          icon: <ShoppingBag className="w-4 h-4 text-amber-400" />,
          title: 'Campus Products',
          text: 'Buy & sell textbooks, calculators, dorm supplies & gadgets.',
        },
        {
          icon: <Wrench className="w-4 h-4 text-cyan-400" />,
          title: 'Student Services',
          text: 'Typing, printing, campus logistics & exam assistance.',
        },
      ],
    },
    {
      id: 'redemption',
      shortTitle: 'GP Value',
      stepNumber: 6,
      badge: 'INSTANT REWARDS PIPELINE',
      title: 'Turn Your GP Into Airtime, Data & Cash',
      highlightText: 'Airtime, Data & Cash',
      tagline: 'Direct utility for your academic excellence.',
      description:
        'Your academic dedication pays off. Use your accumulated GP to top up airtime and mobile data bundles across all Nigerian telecom networks, or withdraw eligible funds directly into your Nigerian bank account.',
      visual: <GPRedemptionVisual />,
      featureCards: [
        {
          icon: <Smartphone className="w-4 h-4 text-emerald-400" />,
          title: 'Airtime & Data Top-ups',
          text: 'Automated recharges for MTN, Airtel, Glo & 9mobile.',
        },
        {
          icon: <Wallet className="w-4 h-4 text-amber-400" />,
          title: 'Bank Cash-Out',
          text: 'Withdraw eligible GP directly into any Nigerian bank.',
        },
        {
          icon: <Zap className="w-4 h-4 text-cyan-400" />,
          title: 'Instant Settlements',
          text: 'Fast, automated transactions directly through your wallet.',
        },
        {
          icon: <ShieldCheck className="w-4 h-4 text-blue-400" />,
          title: 'Zero Hidden Fees',
          text: '1 GP is always strictly valued at ₦1 academic exchange.',
        },
      ],
    },
  ];

  const currentMeta = stepsMeta[currentStep];

  // Touch gesture swipe handling
  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchEnd(null);
    setTouchStart(e.targetTouches[0].clientX);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };

  const handleTouchEnd = () => {
    if (!touchStart || !touchEnd) return;
    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > 50;
    const isRightSwipe = distance < -50;

    if (isLeftSwipe && currentStep < totalSteps - 1) {
      handleNext();
    } else if (isRightSwipe && currentStep > 0) {
      handlePrev();
    }
  };

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight' && currentStep < totalSteps - 1) {
        handleNext();
      } else if (e.key === 'ArrowLeft' && currentStep > 0) {
        handlePrev();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentStep]);

  const handleNext = () => {
    if (currentStep < totalSteps - 1) {
      setCurrentStep((prev) => prev + 1);
    } else {
      onComplete();
    }
  };

  const handlePrev = () => {
    if (currentStep > 0) {
      setCurrentStep((prev) => prev - 1);
    }
  };

  const goToStep = (index: number) => {
    setCurrentStep(index);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col justify-between bg-[#040817] text-white overflow-y-auto no-scrollbar select-none font-sans"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Background Ambient Atmosphere: Glowing Radials */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-32 left-1/2 -translate-x-1/2 w-[700px] h-[700px] bg-blue-600/15 rounded-full blur-[140px] animate-pulse-glow" />
        <div className="absolute top-1/3 -right-32 w-[550px] h-[550px] bg-cyan-600/10 rounded-full blur-[120px]" />
        <div className="absolute -bottom-32 -left-32 w-[600px] h-[600px] bg-blue-700/15 rounded-full blur-[140px]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_0%,rgba(4,8,23,0.75)_100%)]" />
      </div>

      {/* Top Header Bar */}
      <header className="relative z-20 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-safe pt-3 sm:pt-5 pb-2 flex items-center justify-between shrink-0">
        {/* Brand Logo */}
        <div className="flex items-center gap-2.5 sm:gap-3">
          <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-md shadow-blue-500/25">
            <GraduationCap className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-lg sm:text-xl font-black tracking-tight text-white">
                GROBAAX
              </span>
              <span className="hidden sm:inline-block px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-500/15 border border-blue-400/30 text-blue-300">
                Academic Arena
              </span>
            </div>
          </div>
        </div>

        {/* Center Desktop Step Navigation Pills (Visible on md/lg screens) */}
        <nav className="hidden md:flex items-center gap-1.5 p-1 rounded-2xl bg-white/[0.04] border border-white/10 backdrop-blur-md">
          {stepsMeta.map((step, idx) => {
            const isActive = idx === currentStep;
            return (
              <button
                key={step.id}
                type="button"
                onClick={() => goToStep(idx)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                  isActive
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
                }`}
              >
                <span
                  className={`w-1.5 h-1.5 rounded-full ${
                    isActive ? 'bg-cyan-300' : 'bg-slate-500'
                  }`}
                />
                <span>{step.shortTitle}</span>
              </button>
            );
          })}
        </nav>

        {/* Action Controls */}
        <div className="flex items-center gap-2 sm:gap-3">
          <button
            type="button"
            onClick={onComplete}
            className="text-xs sm:text-sm font-semibold text-slate-300 hover:text-white transition-colors px-2.5 sm:px-3 py-1.5 rounded-lg hover:bg-white/10 cursor-pointer"
          >
            Skip Tour
          </button>
          <button
            type="button"
            onClick={onGoToLogin}
            className="text-xs sm:text-sm font-bold text-blue-400 hover:text-blue-300 transition-colors px-3 py-1.5 rounded-xl bg-blue-500/15 border border-blue-500/30 hover:bg-blue-500/25 cursor-pointer"
          >
            Login
          </button>
          <button
            type="button"
            onClick={onGoToRegister}
            className="hidden sm:inline-flex text-xs sm:text-sm font-bold text-white transition-colors px-3.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 shadow-md shadow-blue-600/25 cursor-pointer"
          >
            Register
          </button>
        </div>
      </header>

      {/* Main Interactive Stage */}
      <main className="relative z-10 flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2 sm:py-4 flex flex-col justify-center my-auto">
        {/* DESKTOP & LAPTOP VIEW (lg: screens and above) */}
        <div className="hidden lg:grid lg:grid-cols-12 lg:gap-10 xl:gap-14 items-center w-full">
          {/* Left Column: Rich Copy & Domain Features */}
          <div className="lg:col-span-6 xl:col-span-6 space-y-4 xl:space-y-6 text-left">
            {/* Step Category Eyebrow */}
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/15 border border-blue-400/30 text-blue-300 text-xs font-bold tracking-wide">
              <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
              <span>
                STEP {currentMeta.stepNumber} OF {totalSteps}
              </span>
              <span className="text-blue-400/60">·</span>
              <span>{currentMeta.badge}</span>
            </div>

            {/* Headline */}
            <h1 className="text-3xl xl:text-4xl 2xl:text-5xl font-black tracking-tight leading-[1.15] text-white">
              {currentMeta.title.includes(currentMeta.highlightText) ? (
                <>
                  {currentMeta.title.split(currentMeta.highlightText)[0]}
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-blue-300 to-indigo-300 drop-shadow-[0_0_24px_rgba(34,211,238,0.35)]">
                    {currentMeta.highlightText}
                  </span>
                  {currentMeta.title.split(currentMeta.highlightText)[1]}
                </>
              ) : (
                currentMeta.title
              )}
            </h1>

            {/* Tagline / Pitch */}
            {currentMeta.tagline && (
              <p className="text-sm font-bold text-amber-400 tracking-wide">
                {currentMeta.tagline}
              </p>
            )}

            {/* Detailed Description */}
            <p className="text-sm xl:text-base text-slate-300 leading-relaxed font-normal max-w-xl">
              {currentMeta.description}
            </p>

            {/* 4 Feature Highlights Grid */}
            <div className="grid grid-cols-2 gap-2.5 pt-1 max-w-xl">
              {currentMeta.featureCards.map((feat, idx) => (
                <div
                  key={idx}
                  className="p-2.5 xl:p-3 rounded-2xl bg-white/[0.03] border border-white/10 hover:border-blue-500/40 transition-all hover:bg-white/[0.05]"
                >
                  <div className="flex items-center gap-2 mb-1">
                    <div className="p-1 rounded-lg bg-white/[0.06]">
                      {feat.icon}
                    </div>
                    <span className="text-xs font-bold text-white">
                      {feat.title}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-300 leading-snug">
                    {feat.text}
                  </p>
                </div>
              ))}
            </div>

            {/* Desktop Navigation Helper Hint */}
            <div className="pt-2 flex items-center gap-2 text-xs text-slate-400">
              <span className="px-1.5 py-0.5 rounded bg-white/10 text-[10px] font-mono font-bold">
                ←
              </span>
              <span className="px-1.5 py-0.5 rounded bg-white/10 text-[10px] font-mono font-bold">
                →
              </span>
              <span>Use keyboard arrow keys or click Next to navigate</span>
            </div>
          </div>

          {/* Right Column: Visual Stage Showcase */}
          <div className="lg:col-span-6 xl:col-span-6 flex items-center justify-center">
            <div className="relative w-full max-w-[480px] xl:max-w-[520px]">
              {/* Glowing Aura Behind Visual */}
              <div className="absolute -inset-4 bg-gradient-to-tr from-blue-600/20 via-cyan-500/15 to-purple-600/20 rounded-3xl blur-2xl opacity-75" />
              <div className="relative z-10 transition-all duration-300">
                {currentMeta.visual}
              </div>
            </div>
          </div>
        </div>

        {/* MOBILE & TABLET VIEW (< lg: screens) */}
        <div className="lg:hidden flex flex-col items-center text-center w-full max-w-md mx-auto space-y-3 sm:space-y-4 animate-in fade-in zoom-in-95 duration-200">
          {/* Headline & Subtitle */}
          <div className="space-y-1.5 max-w-sm px-2">
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight leading-tight text-white">
              {currentMeta.title.includes(currentMeta.highlightText) ? (
                <>
                  {currentMeta.title.split(currentMeta.highlightText)[0]}
                  <span className="text-cyan-400 drop-shadow-[0_0_16px_rgba(34,211,238,0.4)]">
                    {currentMeta.highlightText}
                  </span>
                  {currentMeta.title.split(currentMeta.highlightText)[1]}
                </>
              ) : (
                currentMeta.title
              )}
            </h1>
            {currentMeta.tagline && (
              <p className="text-xs sm:text-sm font-bold text-amber-400">
                {currentMeta.tagline}
              </p>
            )}
            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed font-normal">
              {currentMeta.description}
            </p>
          </div>

          {/* Mobile Visual Showcase */}
          <div className="w-full">
            {currentMeta.visual}
          </div>

          {/* Bottom 4 Feature Value Grid for Mobile */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 w-full pt-0.5">
            {currentMeta.featureCards.slice(0, 4).map((feat, idx) => (
              <div
                key={idx}
                className="flex flex-col items-center justify-center p-2 rounded-2xl bg-white/[0.04] border border-white/10"
              >
                <div className="mb-1">{feat.icon}</div>
                <span className="text-[10px] sm:text-[11px] font-bold text-slate-200">
                  {feat.title}
                </span>
              </div>
            ))}
          </div>
        </div>
      </main>

      {/* Bottom Navigation Footer */}
      <footer className="relative z-20 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-safe pb-4 sm:pb-6 pt-2 flex items-center justify-between gap-3 shrink-0 border-t border-white/[0.06]">
        {/* Back Button */}
        <div className="w-24 sm:w-32 flex justify-start">
          {currentStep > 0 ? (
            <button
              type="button"
              onClick={handlePrev}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 sm:py-2.5 rounded-full bg-white/[0.08] hover:bg-white/[0.14] text-slate-200 text-xs sm:text-sm font-semibold transition-all cursor-pointer border border-white/10 active:scale-95"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back</span>
            </button>
          ) : (
            <div className="w-20" />
          )}
        </div>

        {/* Center Progress Dots & Counter */}
        <div className="flex flex-col items-center gap-1.5">
          <div className="flex items-center gap-1.5 sm:gap-2">
            {Array.from({ length: totalSteps }).map((_, i) => (
              <button
                key={i}
                type="button"
                onClick={() => goToStep(i)}
                className={`h-2 rounded-full transition-all duration-300 cursor-pointer ${
                  i === currentStep
                    ? 'w-7 sm:w-8 bg-blue-500 shadow-sm shadow-blue-500/50'
                    : 'w-2 bg-white/20 hover:bg-white/40'
                }`}
                aria-label={`Go to slide ${i + 1}`}
              />
            ))}
          </div>
          <span className="hidden sm:inline-block text-[11px] text-slate-400 font-medium">
            Slide {currentStep + 1} of {totalSteps}
          </span>
        </div>

        {/* Next / Get Started Button */}
        <div className="w-28 sm:w-36 flex justify-end">
          {currentStep < totalSteps - 1 ? (
            <button
              type="button"
              onClick={handleNext}
              className="w-full inline-flex items-center justify-center gap-1.5 px-4 py-2 sm:py-2.5 rounded-full bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white text-xs sm:text-sm font-bold shadow-lg shadow-blue-600/30 transition-all cursor-pointer active:scale-95"
            >
              <span>Next</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          ) : (
            <button
              type="button"
              onClick={onComplete}
              className="w-full inline-flex items-center justify-center gap-1.5 px-4 py-2 sm:py-2.5 rounded-full bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 text-white text-xs sm:text-sm font-black shadow-lg shadow-blue-600/40 transition-all cursor-pointer active:scale-95 animate-pulse"
            >
              <span>Get Started</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          )}
        </div>
      </footer>
    </div>
  );
};
