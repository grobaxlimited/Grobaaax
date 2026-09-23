import React, { useEffect } from 'react';
import { CheckCircle2, GraduationCap, ArrowRight } from 'lucide-react';

export const AuthCallbackReturn: React.FC = () => {
  useEffect(() => {
    // Attempt automatic window close immediately
    try {
      window.close();
    } catch (_) {}

    // Retry automatic close after brief intervals
    const t1 = setTimeout(() => {
      try {
        window.close();
      } catch (_) {}
    }, 400);

    const t2 = setTimeout(() => {
      try {
        window.close();
      } catch (_) {}
    }, 1200);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, []);

  const handleManualClose = () => {
    try {
      window.close();
    } catch (_) {}

    // Fallback: If window.close() is blocked, navigate back or to root
    setTimeout(() => {
      try {
        if (window.history.length > 1) {
          window.history.back();
        } else {
          window.location.replace('/');
        }
      } catch (_) {
        window.location.href = '/';
      }
    }, 300);
  };

  return (
    <div className="fixed inset-0 z-50 bg-[#040817] text-white flex flex-col items-center justify-center p-6 text-center select-none font-sans">
      <div className="relative mb-6">
        <div className="w-20 h-20 rounded-3xl bg-blue-600 flex items-center justify-center text-white shadow-2xl shadow-blue-500/40 animate-pulse">
          <GraduationCap className="w-10 h-10" />
        </div>
        <div className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full bg-emerald-500 border-2 border-[#040817] flex items-center justify-center text-white shadow-md">
          <CheckCircle2 className="w-5 h-5 text-white" />
        </div>
      </div>

      <h1 className="text-2xl font-black tracking-tight text-white mb-2">
        Signed in Successfully!
      </h1>

      <p className="text-sm text-slate-300 max-w-xs mb-8 leading-relaxed">
        Your Grobaax session is authenticated. You can now close this tab to return to the app.
      </p>

      <button
        type="button"
        onClick={handleManualClose}
        className="w-full max-w-xs py-3.5 px-6 rounded-full bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white font-bold text-sm shadow-xl shadow-blue-600/40 transition-all cursor-pointer flex items-center justify-center gap-2 active:scale-95"
      >
        <span>Return to Grobaax</span>
        <ArrowRight className="w-4 h-4" />
      </button>

      <p className="text-xs text-slate-500 mt-4">
        Or tap the <span className="text-slate-300 font-bold">[✕]</span> at the top of your screen.
      </p>
    </div>
  );
};
