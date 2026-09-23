import React from 'react';
import { Users, GraduationCap, MessageCircle, Sparkles, UserCheck, ShieldCheck } from 'lucide-react';

export const CampusNetworkVisual: React.FC = () => {
  return (
    <div className="relative w-full aspect-[4/3.2] max-h-[280px] sm:max-h-[320px] lg:max-h-[370px] xl:max-h-[410px] rounded-3xl overflow-hidden border border-blue-500/30 bg-gradient-to-b from-[#08152e] via-[#050f21] to-[#040817] shadow-2xl shadow-blue-950/50 p-3.5 sm:p-4 flex flex-col justify-between select-none">
      {/* Background Ambience */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 bg-blue-600/15 rounded-full blur-3xl animate-pulse-glow" />
        <div className="absolute -bottom-8 -left-8 w-32 h-32 bg-cyan-600/15 rounded-full blur-2xl" />
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#1d4ed80c_1px,transparent_1px),linear-gradient(to_bottom,#1d4ed80c_1px,transparent_1px)] bg-[size:18px_18px]" />
      </div>

      {/* Top Header Pill */}
      <div className="relative z-10 w-full flex items-center justify-between">
        <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-blue-500/20 border border-blue-400/40 text-blue-200 text-[10px] font-bold">
          <Users className="w-3 h-3 text-blue-400" />
          <span>Inter-Institutional Student Grid</span>
        </div>
        <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-400/30 text-emerald-300 text-[10px] font-bold">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
          <span>Active Campus</span>
        </div>
      </div>

      {/* Interactive Constellation / Connection Network View */}
      <div className="relative z-10 w-full h-[170px] my-auto flex items-center justify-center">
        {/* SVG Flowing Connection Lines */}
        <svg className="absolute inset-0 w-full h-full pointer-events-none">
          {/* Center to Top-Left */}
          <line x1="50%" y1="50%" x2="20%" y2="25%" stroke="#38bdf8" strokeWidth="1.5" className="animate-flow-dash opacity-60" />
          {/* Center to Top-Right */}
          <line x1="50%" y1="50%" x2="80%" y2="25%" stroke="#818cf8" strokeWidth="1.5" className="animate-flow-dash opacity-60" />
          {/* Center to Bottom-Left */}
          <line x1="50%" y1="50%" x2="22%" y2="78%" stroke="#34d399" strokeWidth="1.5" className="animate-flow-dash opacity-60" />
          {/* Center to Bottom-Right */}
          <line x1="50%" y1="50%" x2="78%" y2="78%" stroke="#fbbf24" strokeWidth="1.5" className="animate-flow-dash opacity-60" />
        </svg>

        {/* Central Hub: The Scholar ("You") */}
        <div className="relative z-20 flex flex-col items-center animate-float-slow">
          <div className="absolute -inset-2 rounded-full border border-blue-400/30 animate-radar-ping pointer-events-none" />
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-blue-700 via-blue-600 to-cyan-400 p-0.5 shadow-xl shadow-blue-500/40">
            <div className="w-full h-full rounded-[14px] bg-[#071330] flex flex-col items-center justify-center text-white">
              <GraduationCap className="w-6 h-6 text-cyan-300" />
              <span className="text-[8px] font-black tracking-wider text-cyan-200 uppercase">You</span>
            </div>
          </div>
        </div>

        {/* Node 1: Top Left (UNILAG) */}
        <div className="absolute top-1 left-2 sm:left-4 z-10 flex items-center gap-1.5 p-1.5 rounded-xl bg-slate-900/80 border border-blue-500/40 shadow-lg backdrop-blur-md animate-bounce" style={{ animationDuration: '4.8s' }}>
          <div className="w-7 h-7 rounded-lg bg-blue-600/30 flex items-center justify-center text-blue-300 font-black text-[10px]">
            UN
          </div>
          <div className="text-left pr-1">
            <p className="text-[10px] font-bold text-white leading-tight">Chidi</p>
            <p className="text-[8px] text-blue-300">UNILAG • Med</p>
          </div>
        </div>

        {/* Node 2: Top Right (ABU Zaria) */}
        <div className="absolute top-1 right-2 sm:right-4 z-10 flex items-center gap-1.5 p-1.5 rounded-xl bg-slate-900/80 border border-indigo-500/40 shadow-lg backdrop-blur-md animate-bounce" style={{ animationDuration: '5.2s', animationDelay: '0.4s' }}>
          <div className="w-7 h-7 rounded-lg bg-indigo-600/30 flex items-center justify-center text-indigo-300 font-black text-[10px]">
            AB
          </div>
          <div className="text-left pr-1">
            <p className="text-[10px] font-bold text-white leading-tight">Amina</p>
            <p className="text-[8px] text-indigo-300">ABU • Law</p>
          </div>
        </div>

        {/* Node 3: Bottom Left (OAU Ife) */}
        <div className="absolute bottom-1 left-2 sm:left-4 z-10 flex items-center gap-1.5 p-1.5 rounded-xl bg-slate-900/80 border border-emerald-500/40 shadow-lg backdrop-blur-md animate-bounce" style={{ animationDuration: '4.5s', animationDelay: '0.8s' }}>
          <div className="w-7 h-7 rounded-lg bg-emerald-600/30 flex items-center justify-center text-emerald-300 font-black text-[10px]">
            OA
          </div>
          <div className="text-left pr-1">
            <p className="text-[10px] font-bold text-white leading-tight">Tunde</p>
            <p className="text-[8px] text-emerald-300">OAU • CompSci</p>
          </div>
        </div>

        {/* Node 4: Bottom Right (FUTO) */}
        <div className="absolute bottom-1 right-2 sm:right-4 z-10 flex items-center gap-1.5 p-1.5 rounded-xl bg-slate-900/80 border border-amber-500/40 shadow-lg backdrop-blur-md animate-bounce" style={{ animationDuration: '5s', animationDelay: '1.2s' }}>
          <div className="w-7 h-7 rounded-lg bg-amber-600/30 flex items-center justify-center text-amber-300 font-black text-[10px]">
            FU
          </div>
          <div className="text-left pr-1">
            <p className="text-[10px] font-bold text-white leading-tight">Blessing</p>
            <p className="text-[8px] text-amber-300">FUTO • Engr</p>
          </div>
        </div>
      </div>

      {/* Floating Bottom Info */}
      <div className="relative z-10 w-full flex items-center justify-between px-1 text-[9.5px] text-slate-400 border-t border-white/[0.08] pt-1.5">
        <span className="flex items-center gap-1 text-slate-300">
          <MessageCircle className="w-3 h-3 text-cyan-400" />
          Cross-Faculty Peer Collaboration
        </span>
        <span className="font-semibold text-blue-300">Unified Student Network</span>
      </div>
    </div>
  );
};
