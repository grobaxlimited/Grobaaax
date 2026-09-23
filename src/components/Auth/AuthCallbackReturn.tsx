import React, { useEffect, useState } from 'react';
import { CheckCircle2, GraduationCap, ArrowRight, Loader2 } from 'lucide-react';
import { supabase } from '../../lib/supabase';

export const AuthCallbackReturn: React.FC = () => {
  const [isProcessing, setIsProcessing] = useState(true);

  useEffect(() => {
    const processCallback = async () => {
      try {
        const hash = window.location.hash || '';
        const search = window.location.search || '';
        const sParams = new URLSearchParams(search.replace(/^\?/, ''));
        const hParams = new URLSearchParams(hash.replace(/^#/, ''));

        const code = sParams.get('code');
        const accessToken = hParams.get('access_token') || sParams.get('access_token');
        const refreshToken = hParams.get('refresh_token') || sParams.get('refresh_token');

        let session: any = null;
        if (code) {
          const res = await supabase.auth.exchangeCodeForSession(code);
          session = res.data?.session;
        } else if (accessToken) {
          const res = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken || '',
          });
          session = res.data?.session;
        }

        const payload = {
          type: 'SUPABASE_AUTH_SUCCESS',
          hash,
          search,
          code,
          accessToken: session?.access_token || accessToken,
          refreshToken: session?.refresh_token || refreshToken,
          timestamp: Date.now(),
        };

        // 1. BroadcastChannel
        try {
          if (typeof BroadcastChannel !== 'undefined') {
            const bc = new BroadcastChannel('grobaax_oauth_channel');
            bc.postMessage(payload);
          }
        } catch (_) {}

        // 2. LocalStorage for cross-window / tab
        try {
          localStorage.setItem('grobaax_oauth_event', JSON.stringify(payload));
        } catch (_) {}

        // 3. PostMessage to opener
        if (window.opener) {
          try {
            window.opener.postMessage(payload, '*');
          } catch (_) {}
        }
      } catch (e) {
        console.warn('[AuthCallbackReturn] Process error:', e);
      } finally {
        setIsProcessing(false);
      }

      // Try closing immediately
      try {
        window.close();
      } catch (_) {}

      setTimeout(() => {
        try {
          window.close();
        } catch (_) {}
      }, 500);
    };

    processCallback();
  }, []);

  const handleManualClose = () => {
    try {
      window.close();
    } catch (_) {}

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
    }, 200);
  };

  return (
    <div className="fixed inset-0 z-50 bg-[#040817] text-white flex flex-col items-center justify-center p-6 text-center select-none font-sans">
      <div className="relative mb-6">
        <div className="w-20 h-20 rounded-3xl bg-blue-600 flex items-center justify-center text-white shadow-2xl shadow-blue-500/40 animate-pulse">
          <GraduationCap className="w-10 h-10" />
        </div>
        <div className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full bg-emerald-500 border-2 border-[#040817] flex items-center justify-center text-white shadow-md">
          {isProcessing ? (
            <Loader2 className="w-5 h-5 text-white animate-spin" />
          ) : (
            <CheckCircle2 className="w-5 h-5 text-white" />
          )}
        </div>
      </div>

      <h1 className="text-2xl font-black tracking-tight text-white mb-2">
        {isProcessing ? 'Connecting Scholar...' : 'Signed in Successfully!'}
      </h1>

      <p className="text-sm text-slate-300 max-w-xs mb-8 leading-relaxed">
        {isProcessing
          ? 'Finalizing your authenticated session...'
          : 'Your Grobaax session is connected. You can now return to the app.'}
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

