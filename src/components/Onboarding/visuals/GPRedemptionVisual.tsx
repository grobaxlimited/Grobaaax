import React from 'react';
import { Wallet, Smartphone, ArrowDown, Coins, Zap, CreditCard, Sparkles } from 'lucide-react';

export const GPRedemptionVisual: React.FC = () => {
  return (
    <div className="relative w-full aspect-[4/3.2] max-h-[280px] sm:max-h-[310px] rounded-3xl overflow-hidden border border-emerald-500/30 bg-gradient-to-b from-[#06181f] via-[#041117] to-[#040817] shadow-2xl shadow-emerald-950/40 p-3.5 sm:p-4 flex flex-col justify-between select-none">
      {/* Background Ambience */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 bg-emerald-500/15 rounded-full blur-3xl animate-pulse-glow" />
        <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/15 rounded-full blur-2xl" />
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#10b9810c_1px,transparent_1px),linear-gradient(to_bottom,#10b9810c_1px,transparent_1px)] bg-[size:16px_16px]" />
      </div>

      {/* Top Header Pill */}
      <div className="relative z-10 w-full flex items-center justify-between">
        <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-400/40 text-emerald-200 text-[10px] font-bold">
          <Zap className="w-3 h-3 text-emerald-400" />
          <span>Instant GP Value Pipeline</span>
        </div>
        <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-500/20 border border-amber-400/40 text-amber-200 text-[10px] font-bold">
          <Coins className="w-3 h-3 text-amber-400" />
          <span>1 GP = ₦1 Academic Value</span>
        </div>
      </div>

      {/* Live Animated Pipeline Diagram */}
      <div className="relative z-10 w-full my-auto flex flex-col items-center gap-1.5 sm:gap-2">
        {/* Step 1: Earn GP Source */}
        <div className="flex items-center gap-2 px-3 py-1 rounded-xl bg-amber-500/20 border border-amber-400/50 shadow-md shadow-amber-950/40 animate-bounce" style={{ animationDuration: '3s' }}>
          <div className="w-5 h-5 rounded-full bg-gradient-to-tr from-amber-600 to-yellow-400 flex items-center justify-center text-slate-950 font-black text-[9px] shadow-sm">
            GP
          </div>
          <span className="text-xs font-black text-amber-200 tracking-wide">
            Earn Academic GP
          </span>
        </div>

        {/* Animated Laser Arrow 1 */}
        <div className="relative h-4 w-4 flex items-center justify-center">
          <ArrowDown className="w-4 h-4 text-emerald-400 animate-bounce" />
        </div>

        {/* Step 2: GROBAAX Digital Wallet Card */}
        <div className="w-full max-w-[280px] p-2.5 rounded-2xl bg-gradient-to-r from-blue-900/60 via-slate-900/80 to-emerald-950/60 border border-emerald-400/40 shadow-xl shadow-emerald-950/50 backdrop-blur-md flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-emerald-500/25 border border-emerald-400/40 flex items-center justify-center text-emerald-300">
              <Wallet className="w-4 h-4" />
            </div>
            <div className="text-left">
              <span className="text-[9px] font-bold text-slate-300 uppercase tracking-wider block">
                GROBAAX Wallet
              </span>
              <span className="text-xs sm:text-sm font-black text-white flex items-center gap-1">
                <span className="text-amber-400">4,250</span> GP
                <span className="text-[10px] font-normal text-emerald-300">(₦4,250)</span>
              </span>
            </div>
          </div>

          <div className="px-2 py-0.5 rounded-md bg-emerald-500/20 border border-emerald-400/30 text-[9px] font-black text-emerald-300 uppercase">
            Ready
          </div>
        </div>

        {/* Animated Laser Arrow 2 */}
        <div className="relative h-4 w-4 flex items-center justify-center">
          <ArrowDown className="w-4 h-4 text-emerald-400 animate-bounce" />
        </div>

        {/* Step 3: Redemption Destinations (Airtime & Data | Cash Out) */}
        <div className="grid grid-cols-2 gap-2 w-full max-w-[280px]">
          {/* Airtime & Data Card */}
          <div className="p-2 rounded-xl bg-emerald-950/40 border border-emerald-500/30 flex items-center gap-2 hover:border-emerald-400 transition-all">
            <div className="w-6 h-6 rounded-lg bg-emerald-500/20 flex items-center justify-center text-emerald-300 shrink-0">
              <Smartphone className="w-3.5 h-3.5" />
            </div>
            <div className="text-left leading-tight">
              <p className="text-[10px] font-bold text-white">Airtime / Data</p>
              <p className="text-[8px] text-emerald-300">Instant Recharge</p>
            </div>
          </div>

          {/* Cash Out Card */}
          <div className="p-2 rounded-xl bg-amber-950/40 border border-amber-500/30 flex items-center gap-2 hover:border-amber-400 transition-all">
            <div className="w-6 h-6 rounded-lg bg-amber-500/20 flex items-center justify-center text-amber-300 shrink-0">
              <CreditCard className="w-3.5 h-3.5" />
            </div>
            <div className="text-left leading-tight">
              <p className="text-[10px] font-bold text-white">Cash Out</p>
              <p className="text-[8px] text-amber-300">Direct Bank Credit</p>
            </div>
          </div>
        </div>
      </div>

      {/* Floating Bottom Info */}
      <div className="relative z-10 w-full flex items-center justify-between px-1 text-[9.5px] text-slate-400 border-t border-white/[0.08] pt-1.5">
        <span className="flex items-center gap-1 text-slate-300">
          <Sparkles className="w-3 h-3 text-emerald-400" />
          MTN • Airtel • Glo • Bank Transfer
        </span>
        <span className="font-semibold text-emerald-300">Zero Processing Delay</span>
      </div>
    </div>
  );
};
