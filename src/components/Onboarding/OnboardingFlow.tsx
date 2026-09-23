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
  ArrowDown,
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
  const [slideDirection, setSlideDirection] = useState<'next' | 'prev'>('next');
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);

  const totalSteps = 6;

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
      setSlideDirection('next');
      setCurrentStep((prev) => prev + 1);
    } else {
      onComplete();
    }
  };

  const handlePrev = () => {
    if (currentStep > 0) {
      setSlideDirection('prev');
      setCurrentStep((prev) => prev - 1);
    }
  };

  const goToStep = (index: number) => {
    setSlideDirection(index > currentStep ? 'next' : 'prev');
    setCurrentStep(index);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col justify-between bg-[#040817] text-white overflow-hidden select-none font-sans"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Background Animated Atmosphere: Glowing Blue Radials & Vignette */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-32 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-blue-600/20 rounded-full blur-[120px] animate-pulse-glow" />
        <div className="absolute top-1/3 -right-32 w-[450px] h-[450px] bg-cyan-600/15 rounded-full blur-[100px]" />
        <div className="absolute -bottom-32 -left-32 w-[500px] h-[500px] bg-blue-700/20 rounded-full blur-[120px]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_0%,rgba(4,8,23,0.7)_100%)]" />
      </div>

      {/* Top Header Bar: Logo & Direct Auth Actions */}
      <header className="relative z-20 w-full max-w-lg mx-auto px-5 pt-safe pt-4 sm:pt-6 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-md shadow-blue-500/20">
            <GraduationCap className="w-5 h-5" />
          </div>
          <span className="text-lg sm:text-xl font-black tracking-tight text-white">
            GROBAAX
          </span>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onComplete}
            className="text-xs sm:text-sm font-semibold text-slate-300 hover:text-white transition-colors px-2.5 py-1.5 rounded-lg hover:bg-white/10 cursor-pointer"
          >
            Skip
          </button>
          <button
            type="button"
            onClick={onGoToLogin}
            className="text-xs sm:text-sm font-bold text-blue-400 hover:text-blue-300 transition-colors px-3 py-1.5 rounded-xl bg-blue-500/15 border border-blue-500/30 hover:bg-blue-500/25 cursor-pointer"
          >
            Login
          </button>
        </div>
      </header>

      {/* Main Interactive Slider Viewport */}
      <main className="relative z-10 flex-1 w-full max-w-md mx-auto px-4 flex flex-col justify-center overflow-y-auto no-scrollbar py-2 sm:py-4">
        {/* Step 0: WELCOME TO GROBAAX */}
        {currentStep === 0 && (
          <div
            key="step-0"
            className="flex flex-col items-center text-center animate-in fade-in zoom-in-95 duration-300 w-full space-y-3.5 sm:space-y-4"
          >
            <div className="space-y-1.5 max-w-sm px-2">
              <h1 className="text-2xl sm:text-3xl font-black tracking-tight leading-tight text-white">
                Your School.{' '}
                <span className="text-cyan-400 drop-shadow-[0_0_16px_rgba(34,211,238,0.4)]">
                  Your Community.
                </span>{' '}
                Your Growth.
              </h1>
              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed font-normal">
                GROBAAX is an academic network for Nigerian tertiary students. Learn, compete, connect and earn — all in one place.
              </p>
            </div>

            {/* Live Animated UI Visual */}
            <WelcomeVisual />

            {/* Bottom 4 Feature Value Pills: Learn, Compete, Connect, Earn */}
            <div className="grid grid-cols-4 gap-2 w-full pt-0.5">
              <div className="flex flex-col items-center justify-center p-2 rounded-2xl bg-white/[0.04] border border-white/10 hover:border-blue-500/40 transition-all">
                <BookOpen className="w-4 h-4 sm:w-5 sm:h-5 text-blue-400 mb-1" />
                <span className="text-[10px] sm:text-[11px] font-bold text-slate-200">Learn</span>
              </div>
              <div className="flex flex-col items-center justify-center p-2 rounded-2xl bg-white/[0.04] border border-white/10 hover:border-amber-500/40 transition-all">
                <Trophy className="w-4 h-4 sm:w-5 sm:h-5 text-amber-400 mb-1" />
                <span className="text-[10px] sm:text-[11px] font-bold text-slate-200">Compete</span>
              </div>
              <div className="flex flex-col items-center justify-center p-2 rounded-2xl bg-white/[0.04] border border-white/10 hover:border-cyan-500/40 transition-all">
                <Users className="w-4 h-4 sm:w-5 sm:h-5 text-cyan-400 mb-1" />
                <span className="text-[10px] sm:text-[11px] font-bold text-slate-200">Connect</span>
              </div>
              <div className="flex flex-col items-center justify-center p-2 rounded-2xl bg-white/[0.04] border border-white/10 hover:border-emerald-500/40 transition-all">
                <Coins className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-400 mb-1" />
                <span className="text-[10px] sm:text-[11px] font-bold text-slate-200">Earn</span>
              </div>
            </div>
          </div>
        )}

        {/* Step 1: SCHOOL DOME (The Flagship Competition) */}
        {currentStep === 1 && (
          <div
            key="step-1"
            className="flex flex-col items-center text-center animate-in fade-in zoom-in-95 duration-300 w-full space-y-3 sm:space-y-3.5"
          >
            <div className="space-y-1.5 max-w-sm px-2">
              <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white flex items-center justify-center gap-2">
                <span>School Dome</span>
                <span className="text-xl">🏆</span>
              </h1>
              <p className="text-xs sm:text-sm font-bold text-amber-400">
                Represent your school. Compete. Stay standing.
              </p>
              <p className="text-[11.5px] sm:text-xs text-slate-300 leading-relaxed font-normal">
                A season-based academic competition where your entire school represents its institution, answers academic questions, and competes to remain standing until the end of the season. The last person standing brings pride to their school and earns GP rewards.
              </p>
            </div>

            {/* Badges: Every Saturday & Sunday + SEASON-BASED */}
            <div className="flex items-center justify-center gap-2 pt-0.5">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-500/20 border border-blue-400/40 text-blue-300 text-[11px] font-semibold">
                <Calendar className="w-3.5 h-3.5 text-blue-400" />
                <span>Every Saturday & Sunday</span>
              </div>
              <div className="inline-flex items-center px-2.5 py-1 rounded-full bg-amber-500/20 border border-amber-400/40 text-amber-300 text-[10px] font-black tracking-wider uppercase">
                SEASON-BASED
              </div>
            </div>

            {/* Live Animated Arena UI Visual */}
            <SchoolDomeVisual />
          </div>
        )}

        {/* Step 2: DAILY GP GRAB */}
        {currentStep === 2 && (
          <div
            key="step-2"
            className="flex flex-col items-center text-center animate-in fade-in zoom-in-95 duration-300 w-full space-y-3 sm:space-y-3.5"
          >
            <div className="space-y-1.5 max-w-sm px-2">
              <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white flex items-center justify-center gap-2">
                <span>Daily</span>
                <span className="px-2 py-0.5 rounded-lg bg-gradient-to-r from-amber-500 to-yellow-400 text-slate-950 font-black text-xl shadow-md shadow-amber-500/30">
                  GP
                </span>
                <span>Grab</span>
              </h1>
              <p className="text-xs sm:text-sm font-bold text-cyan-400">
                Answer. Earn GP. Repeat.
              </p>
              <p className="text-[11.5px] sm:text-xs text-slate-300 leading-relaxed font-normal">
                Every Monday to Friday, take part in Daily GP Grab by answering academic questions. Get GP for your correct answers and use your GP through GROBAAX's available redemption options.
              </p>
            </div>

            {/* Badge: Monday - Friday */}
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-cyan-500/20 border border-cyan-400/40 text-cyan-300 text-[11px] font-semibold">
              <Calendar className="w-3.5 h-3.5 text-cyan-400" />
              <span>Monday – Friday</span>
            </div>

            {/* Live Animated Daily Challenge UI Visual */}
            <DailyGPGrabVisual />
          </div>
        )}

        {/* Step 3: CAMPUS */}
        {currentStep === 3 && (
          <div
            key="step-3"
            className="flex flex-col items-center text-center animate-in fade-in zoom-in-95 duration-300 w-full space-y-3 sm:space-y-3.5"
          >
            <div className="space-y-1.5 max-w-sm px-2">
              <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white flex items-center justify-center gap-2">
                <span>Campus</span>
                <span className="text-xl">🎓</span>
              </h1>
              <p className="text-xs sm:text-sm font-bold text-blue-400">
                Connect with students from your institution.
              </p>
              <p className="text-[11.5px] sm:text-xs text-slate-300 leading-relaxed font-normal">
                Meet and interact with other students from your school. Build your network, share ideas and be part of your campus community.
              </p>
            </div>

            {/* Floating Network Mini Card Indicator */}
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-600/20 border border-blue-400/30 text-blue-300 text-[11px] font-semibold">
              <Users className="w-3.5 h-3.5 text-blue-400" />
              <span>Inter-Institutional Student Networks</span>
            </div>

            {/* Live Animated Campus Network UI Visual */}
            <CampusNetworkVisual />
          </div>
        )}

        {/* Step 4: CAMPUS MINIMART */}
        {currentStep === 4 && (
          <div
            key="step-4"
            className="flex flex-col items-center text-center animate-in fade-in zoom-in-95 duration-300 w-full space-y-3 sm:space-y-3.5"
          >
            <div className="space-y-1.5 max-w-sm px-2">
              <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white flex items-center justify-center gap-2">
                <span>Campus MiniMart</span>
                <span className="text-xl">🛍️</span>
              </h1>
              <p className="text-xs sm:text-sm font-bold text-amber-400">
                Discover what students have to offer.
              </p>
              <p className="text-[11.5px] sm:text-xs text-slate-300 leading-relaxed font-normal">
                Buy and sell skills, handouts, products and services within the student community.
              </p>
            </div>

            {/* 4 Marketplace Badges */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 w-full max-w-sm">
              <div className="flex items-center justify-center gap-1.5 py-1.5 px-2.5 rounded-xl bg-purple-500/15 border border-purple-500/30 text-purple-300 text-xs font-semibold">
                <Palette className="w-3.5 h-3.5 text-purple-400" />
                <span>Skills</span>
              </div>
              <div className="flex items-center justify-center gap-1.5 py-1.5 px-2.5 rounded-xl bg-blue-500/15 border border-blue-500/30 text-blue-300 text-xs font-semibold">
                <FileText className="w-3.5 h-3.5 text-blue-400" />
                <span>Handouts</span>
              </div>
              <div className="flex items-center justify-center gap-1.5 py-1.5 px-2.5 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-300 text-xs font-semibold">
                <ShoppingBag className="w-3.5 h-3.5 text-amber-400" />
                <span>Products</span>
              </div>
              <div className="flex items-center justify-center gap-1.5 py-1.5 px-2.5 rounded-xl bg-cyan-500/15 border border-cyan-500/30 text-cyan-300 text-xs font-semibold">
                <Wrench className="w-3.5 h-3.5 text-cyan-400" />
                <span>Services</span>
              </div>
            </div>

            {/* Live Animated Student MiniMart UI Visual */}
            <MiniMartVisual />
          </div>
        )}

        {/* Step 5: GP REDEMPTION */}
        {currentStep === 5 && (
          <div
            key="step-5"
            className="flex flex-col items-center text-center animate-in fade-in zoom-in-95 duration-300 w-full space-y-3 sm:space-y-3.5"
          >
            <div className="space-y-1.5 max-w-sm px-2">
              <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
                Turn Your{' '}
                <span className="text-amber-400 drop-shadow-[0_0_12px_rgba(251,191,36,0.5)]">
                  GP
                </span>{' '}
                Into Value
              </h1>
              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed font-normal">
                Use your earned GP to redeem airtime/data and access eligible cash-out options.
              </p>
            </div>

            {/* Live Animated GP Value Pipeline UI Visual */}
            <GPRedemptionVisual />
          </div>
        )}
      </main>

      {/* Bottom Navigation Controls: Back, Dots, Next/Get Started */}
      <footer className="relative z-20 w-full max-w-lg mx-auto px-5 pb-safe pb-5 sm:pb-8 flex items-center justify-between gap-3">
        {/* Back Button (Hidden on first screen) */}
        <div className="w-24 flex justify-start">
          {currentStep > 0 ? (
            <button
              type="button"
              onClick={handlePrev}
              className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-full bg-white/[0.08] hover:bg-white/[0.14] text-slate-200 text-xs sm:text-sm font-semibold transition-all cursor-pointer border border-white/10 active:scale-95"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back</span>
            </button>
          ) : (
            <div className="w-20" />
          )}
        </div>

        {/* Small Progress Dots (6 dots) */}
        <div className="flex items-center gap-1.5">
          {Array.from({ length: totalSteps }).map((_, i) => (
            <button
              key={i}
              type="button"
              onClick={() => goToStep(i)}
              className={`h-2 rounded-full transition-all duration-300 cursor-pointer ${
                i === currentStep
                  ? 'w-6 bg-blue-500 shadow-sm shadow-blue-500/50'
                  : 'w-2 bg-white/20 hover:bg-white/40'
              }`}
              aria-label={`Go to slide ${i + 1}`}
            />
          ))}
        </div>

        {/* Next / Get Started Button */}
        <div className="w-28 sm:w-32 flex justify-end">
          {currentStep < totalSteps - 1 ? (
            <button
              type="button"
              onClick={handleNext}
              className="w-full inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-full bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white text-xs sm:text-sm font-bold shadow-lg shadow-blue-600/30 transition-all cursor-pointer active:scale-95"
            >
              <span>Next</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          ) : (
            <button
              type="button"
              onClick={onComplete}
              className="w-full inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-full bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 text-white text-xs sm:text-sm font-black shadow-lg shadow-blue-600/40 transition-all cursor-pointer active:scale-95 animate-pulse"
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
