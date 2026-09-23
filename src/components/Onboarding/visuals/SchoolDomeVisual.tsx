import React from 'react';
import { Trophy, Shield, GraduationCap, Flame, Sparkles, Crown } from 'lucide-react';

export const SchoolDomeVisual: React.FC = () => {
  return (
    <div className="relative w-full aspect-[4/3.2] max-h-[280px] sm:max-h-[320px] lg:max-h-[370px] xl:max-h-[410px] rounded-3xl overflow-hidden border border-amber-500/30 bg-gradient-to-b from-[#0b0c26] via-[#080d22] to-[#040817] shadow-2xl shadow-amber-950/40 p-4 flex flex-col items-center justify-between select-none">
      {/* Stadium Arena Lighting: 2 Sweeping Spotlights & Glowing Rim */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {/* Left Sweeping Spotlight Beam */}
        <div
          className="absolute -top-10 -left-6 w-32 h-64 bg-gradient-to-b from-cyan-400/40 via-blue-500/15 to-transparent blur-xl animate-spotlight-left"
          style={{ clipPath: 'polygon(50% 0%, 0% 100%, 100% 100%)' }}
        />
        {/* Right Sweeping Spotlight Beam */}
        <div
          className="absolute -top-10 -right-6 w-32 h-64 bg-gradient-to-b from-amber-400/40 via-purple-500/15 to-transparent blur-xl animate-spotlight-right"
          style={{ clipPath: 'polygon(50% 0%, 0% 100%, 100% 100%)' }}
        />
        {/* Arena floor rim glow */}
        <div className="absolute bottom-0 inset-x-0 h-20 bg-gradient-to-t from-blue-600/20 via-purple-600/10 to-transparent blur-md" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 bg-amber-500/15 rounded-full blur-3xl animate-pulse-glow" />
      </div>

      {/* Top Suspended School Banners: UNIVERSITY, POLYTECHNIC, COLLEGE OF EDUCATION */}
      <div className="relative z-10 w-full flex items-start justify-center gap-2 pt-1">
        {/* Banner 1: University */}
        <div className="flex flex-col items-center animate-banner-sway">
          <div className="w-16 sm:w-20 px-1 py-1.5 rounded-b-xl bg-gradient-to-b from-blue-600 to-blue-900 border-x border-b border-blue-400/50 shadow-md shadow-blue-950 flex flex-col items-center text-center">
            <Shield className="w-3 h-3 text-cyan-200 mb-0.5" />
            <span className="text-[8px] sm:text-[9px] font-black tracking-wider text-white uppercase leading-none">
              University
            </span>
          </div>
          <div className="w-1.5 h-1.5 bg-blue-400 rounded-full mt-0.5 opacity-80" />
        </div>

        {/* Center Banner: Polytechnic */}
        <div className="flex flex-col items-center animate-banner-sway-delayed">
          <div className="w-18 sm:w-22 px-1 py-2 rounded-b-xl bg-gradient-to-b from-emerald-600 to-emerald-950 border-x border-b border-emerald-400/50 shadow-md shadow-emerald-950 flex flex-col items-center text-center">
            <GraduationCap className="w-3.5 h-3.5 text-emerald-200 mb-0.5" />
            <span className="text-[8.5px] sm:text-[9.5px] font-black tracking-wider text-white uppercase leading-none">
              Polytechnic
            </span>
          </div>
          <div className="w-1.5 h-1.5 bg-emerald-400 rounded-full mt-0.5 opacity-80" />
        </div>

        {/* Banner 3: College of Education */}
        <div className="flex flex-col items-center animate-banner-sway">
          <div className="w-16 sm:w-20 px-1 py-1.5 rounded-b-xl bg-gradient-to-b from-rose-600 to-rose-950 border-x border-b border-rose-400/50 shadow-md shadow-rose-950 flex flex-col items-center text-center">
            <Sparkles className="w-3 h-3 text-rose-200 mb-0.5" />
            <span className="text-[7.5px] sm:text-[8.5px] font-black tracking-wider text-white uppercase leading-none">
              Col. of Edu
            </span>
          </div>
          <div className="w-1.5 h-1.5 bg-rose-400 rounded-full mt-0.5 opacity-80" />
        </div>
      </div>

      {/* Center Stage: Glowing Championship Trophy with Academic Cap */}
      <div className="relative z-10 flex flex-col items-center justify-center my-auto animate-float-slow">
        {/* Radiant Starburst Aura behind trophy */}
        <div className="absolute w-28 h-28 bg-gradient-to-tr from-amber-500/30 to-yellow-300/30 rounded-full blur-xl pointer-events-none" />

        {/* Trophy Structure */}
        <div className="relative flex flex-col items-center">
          {/* Graduation Cap Perched on Trophy */}
          <div className="relative z-20 -mb-2 transform -rotate-6">
            <div className="w-8 h-8 rounded-lg bg-slate-900 border border-amber-400/80 flex items-center justify-center shadow-lg shadow-amber-500/40">
              <GraduationCap className="w-5 h-5 text-amber-300" />
            </div>
            <div className="absolute -top-1 -right-1 w-2 h-2 bg-yellow-400 rounded-full animate-ping" />
          </div>

          {/* Golden Trophy Icon & Pedestal */}
          <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-gradient-to-b from-amber-400 via-yellow-500 to-amber-700 p-0.5 shadow-2xl shadow-amber-500/50 flex items-center justify-center">
            <div className="w-full h-full rounded-full bg-gradient-to-b from-[#181104] to-[#2d1f04] flex items-center justify-center relative overflow-hidden">
              <div className="absolute inset-0 bg-radial from-amber-400/20 to-transparent" />
              <Trophy className="w-9 h-9 sm:w-11 sm:h-11 text-amber-300 drop-shadow-[0_0_12px_rgba(251,191,36,0.9)] animate-coin-sparkle" />
            </div>
          </div>

          {/* Plinth / Arena Base */}
          <div className="w-20 sm:w-24 h-4 bg-gradient-to-r from-amber-800 via-amber-600 to-amber-800 rounded-b-lg border-t border-yellow-300/60 shadow-md flex items-center justify-center -mt-1">
            <span className="text-[8px] font-black text-amber-100 tracking-widest uppercase">
              LAST STANDING
            </span>
          </div>
        </div>

        {/* Floating Arena Live Indicators */}
        <div className="flex items-center gap-2 mt-2">
          <div className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-500/20 border border-amber-400/40 text-amber-200 text-[9.5px] font-bold shadow-sm">
            <Crown className="w-2.5 h-2.5 text-amber-400" />
            <span>Institutional Pride</span>
          </div>
          <div className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-blue-500/20 border border-blue-400/40 text-blue-200 text-[9.5px] font-bold shadow-sm">
            <Flame className="w-2.5 h-2.5 text-rose-400 animate-pulse" />
            <span>Live Saturday & Sunday</span>
          </div>
        </div>
      </div>

      {/* Floating Stadium Bottom Bar */}
      <div className="relative z-10 w-full flex items-center justify-between px-2 pt-1 border-t border-white/[0.08] text-[9.5px] text-slate-400">
        <span className="flex items-center gap-1 text-slate-300">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
          School Representatives United
        </span>
        <span className="font-semibold text-amber-300">GP Championship</span>
      </div>
    </div>
  );
};
