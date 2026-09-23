import React from 'react';
import { Palette, FileText, ShoppingBag, Wrench, Sparkles, ShieldCheck, HeartHandshake } from 'lucide-react';

export const MiniMartVisual: React.FC = () => {
  return (
    <div className="relative w-full aspect-[4/3.2] max-h-[280px] sm:max-h-[320px] lg:max-h-[370px] xl:max-h-[410px] rounded-3xl overflow-hidden border border-purple-500/30 bg-gradient-to-b from-[#140b28] via-[#0d071c] to-[#040817] shadow-2xl shadow-purple-950/40 p-3.5 sm:p-4 flex flex-col justify-between select-none">
      {/* Background Glow */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 bg-purple-600/15 rounded-full blur-3xl animate-pulse-glow" />
        <div className="absolute -top-6 -right-6 w-32 h-32 bg-amber-600/15 rounded-full blur-2xl" />
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#a855f70a_1px,transparent_1px),linear-gradient(to_bottom,#a855f70a_1px,transparent_1px)] bg-[size:16px_16px]" />
      </div>

      {/* Top Banner: Students Supporting Students */}
      <div className="relative z-10 w-full flex items-center justify-between">
        <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-purple-500/20 border border-purple-400/40 text-purple-200 text-[10px] font-bold">
          <HeartHandshake className="w-3.5 h-3.5 text-purple-400" />
          <span>Students Supporting Students</span>
        </div>
        <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-500/20 border border-amber-400/30 text-amber-200 text-[10px] font-bold">
          <ShieldCheck className="w-3 h-3 text-amber-400" />
          <span>Campus Verified</span>
        </div>
      </div>

      {/* 4 Interactive Marketplace Service Cards */}
      <div className="relative z-10 w-full grid grid-cols-2 gap-2 my-auto">
        {/* Card 1: Skills */}
        <div className="p-2 sm:p-2.5 rounded-2xl bg-white/[0.04] border border-purple-500/30 backdrop-blur-md hover:border-purple-400 transition-all flex flex-col justify-between animate-float-slow">
          <div className="flex items-center justify-between mb-1">
            <div className="w-6 h-6 rounded-lg bg-purple-500/25 flex items-center justify-center text-purple-300">
              <Palette className="w-3.5 h-3.5" />
            </div>
            <span className="text-[9px] font-black text-amber-400 bg-amber-500/15 px-1.5 py-0.5 rounded-md">
              200 GP
            </span>
          </div>
          <p className="text-[11px] font-bold text-white leading-tight">UI/UX & Graphics</p>
          <p className="text-[8.5px] text-purple-300/80 mt-0.5">Final Year Scholar</p>
        </div>

        {/* Card 2: Handouts */}
        <div className="p-2 sm:p-2.5 rounded-2xl bg-white/[0.04] border border-blue-500/30 backdrop-blur-md hover:border-blue-400 transition-all flex flex-col justify-between animate-float-slow" style={{ animationDelay: '0.4s' }}>
          <div className="flex items-center justify-between mb-1">
            <div className="w-6 h-6 rounded-lg bg-blue-500/25 flex items-center justify-center text-blue-300">
              <FileText className="w-3.5 h-3.5" />
            </div>
            <span className="text-[9px] font-black text-cyan-400 bg-cyan-500/15 px-1.5 py-0.5 rounded-md">
              ₦500
            </span>
          </div>
          <p className="text-[11px] font-bold text-white leading-tight">GST 101 Handout</p>
          <p className="text-[8.5px] text-blue-300/80 mt-0.5">Verified Summary</p>
        </div>

        {/* Card 3: Products */}
        <div className="p-2 sm:p-2.5 rounded-2xl bg-white/[0.04] border border-amber-500/30 backdrop-blur-md hover:border-amber-400 transition-all flex flex-col justify-between animate-float-slow" style={{ animationDelay: '0.8s' }}>
          <div className="flex items-center justify-between mb-1">
            <div className="w-6 h-6 rounded-lg bg-amber-500/25 flex items-center justify-center text-amber-300">
              <ShoppingBag className="w-3.5 h-3.5" />
            </div>
            <span className="text-[9px] font-black text-amber-300 bg-amber-500/15 px-1.5 py-0.5 rounded-md">
              ₦4,500
            </span>
          </div>
          <p className="text-[11px] font-bold text-white leading-tight">Casio FX Calculator</p>
          <p className="text-[8.5px] text-amber-300/80 mt-0.5">Campus Pickup</p>
        </div>

        {/* Card 4: Services */}
        <div className="p-2 sm:p-2.5 rounded-2xl bg-white/[0.04] border border-cyan-500/30 backdrop-blur-md hover:border-cyan-400 transition-all flex flex-col justify-between animate-float-slow" style={{ animationDelay: '1.2s' }}>
          <div className="flex items-center justify-between mb-1">
            <div className="w-6 h-6 rounded-lg bg-cyan-500/25 flex items-center justify-center text-cyan-300">
              <Wrench className="w-3.5 h-3.5" />
            </div>
            <span className="text-[9px] font-black text-emerald-400 bg-emerald-500/15 px-1.5 py-0.5 rounded-md">
              300 GP
            </span>
          </div>
          <p className="text-[11px] font-bold text-white leading-tight">Hostel Laundry Run</p>
          <p className="text-[8.5px] text-cyan-300/80 mt-0.5">Quick Student Service</p>
        </div>
      </div>

      {/* Floating Bottom Info */}
      <div className="relative z-10 w-full flex items-center justify-between px-1 text-[9.5px] text-slate-400 border-t border-white/[0.08] pt-1.5">
        <span className="flex items-center gap-1 text-slate-300">
          <Sparkles className="w-3 h-3 text-purple-400" />
          Trade with Cash or Earned GP
        </span>
        <span className="font-semibold text-purple-300">Direct Student Exchange</span>
      </div>
    </div>
  );
};
