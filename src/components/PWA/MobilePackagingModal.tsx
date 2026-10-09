import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  X,
  Smartphone,
  Apple,
  Download,
  PackageCheck,
  Terminal,
  FileCode,
  ShieldCheck,
  CheckCircle2,
  Copy,
  ExternalLink,
  BookOpen,
} from 'lucide-react';

interface MobilePackagingModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const MobilePackagingModal: React.FC<MobilePackagingModalProps> = ({
  isOpen,
  onClose,
}) => {
  const [copiedCmd, setCopiedCmd] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedCmd(id);
    setTimeout(() => setCopiedCmd(null), 2000);
  };

  const modalContent = (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/70 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-3xl max-h-[90vh] bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl flex flex-col overflow-hidden text-slate-100">
        
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/90 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-blue-600 flex items-center justify-center text-white shadow-md">
              <Smartphone className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-base sm:text-lg text-white tracking-tight flex items-center gap-2">
                <span>Grobaax Mobile Packaging Suite</span>
                <span className="text-[10px] uppercase font-black px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                  Ready
                </span>
              </h3>
              <p className="text-xs text-slate-400">
                Single-codebase packaging for Google Play (Android APK/AAB) &amp; Apple App Store (iOS)
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="p-5 space-y-6 overflow-y-auto flex-1 text-xs">
          
          {/* Quick Notice */}
          <div className="p-3.5 rounded-xl bg-blue-500/10 border border-blue-500/30 flex items-start gap-3 text-blue-200">
            <ShieldCheck className="w-5 h-5 text-blue-400 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="font-bold text-white">Exact Web App Replication</p>
              <p className="text-slate-300 leading-relaxed">
                The Android and iOS packaging files contain the complete production Grobaax web application. They connect to your existing backend, Firestore database, and authentication. In-app PWA install prompts are automatically suppressed when running inside these native apps.
              </p>
            </div>
          </div>

          {/* Download Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            
            {/* 1. Android Card */}
            <div className="p-4 rounded-xl bg-slate-800/60 border border-slate-700 flex flex-col justify-between space-y-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-emerald-400 font-extrabold">
                    <Smartphone className="w-4 h-4" />
                    <span>Android Package</span>
                  </div>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-300 border border-emerald-500/20">
                    .APK &amp; .AAB
                  </span>
                </div>
                <p className="text-slate-300 text-[11px] leading-relaxed">
                  Complete Android Studio / Gradle project with configured AndroidManifest.xml, icons, and build targets.
                </p>
                <div className="space-y-1 bg-slate-950/70 p-2.5 rounded-lg border border-slate-800 font-mono text-[10px]">
                  <div className="text-slate-400">Testing APK:</div>
                  <div className="text-emerald-300">./gradlew assembleDebug</div>
                  <div className="text-slate-400 pt-1">Google Play Store Bundle:</div>
                  <div className="text-emerald-300">./gradlew bundleRelease</div>
                </div>
              </div>

              <a
                href="/api/download/android"
                download="grobaax-android-project.zip"
                className="w-full py-2.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-md transition cursor-pointer"
              >
                <Download className="w-4 h-4" />
                <span>Download Android Project (.zip)</span>
              </a>
            </div>

            {/* 2. iOS Card */}
            <div className="p-4 rounded-xl bg-slate-800/60 border border-slate-700 flex flex-col justify-between space-y-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-blue-400 font-extrabold">
                    <Apple className="w-4 h-4" />
                    <span>iOS App Store Package</span>
                  </div>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-blue-500/10 text-blue-300 border border-blue-500/20">
                    Xcode Project
                  </span>
                </div>
                <p className="text-slate-300 text-[11px] leading-relaxed">
                  Complete Xcode project configured with bundle ID <code className="text-blue-300">com.grobaax.app</code>, camera/photo usage descriptions, and launch screen.
                </p>
                <div className="space-y-1 bg-slate-950/70 p-2.5 rounded-lg border border-slate-800 font-mono text-[10px]">
                  <div className="text-slate-400">Open in Xcode:</div>
                  <div className="text-blue-300">npx cap open ios</div>
                  <div className="text-slate-400 pt-1">Distribute:</div>
                  <div className="text-blue-300">Product &gt; Archive &gt; Distribute App</div>
                </div>
              </div>

              <a
                href="/api/download/ios"
                download="grobaax-ios-project.zip"
                className="w-full py-2.5 px-3 rounded-xl bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-md transition cursor-pointer"
              >
                <Download className="w-4 h-4" />
                <span>Download iOS Project (.zip)</span>
              </a>
            </div>
          </div>

          {/* 3. Complete Suite & Guide Downloads */}
          <div className="p-4 rounded-xl bg-slate-800/40 border border-slate-700/60 flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-purple-500/20 border border-purple-500/40 text-purple-400 flex items-center justify-center shrink-0">
                <PackageCheck className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-bold text-white text-xs">Complete Mobile Suite (.zip)</h4>
                <p className="text-slate-400 text-[11px]">
                  Combined archive containing both Android &amp; iOS native projects plus guides.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <a
                href="/api/download/guide"
                download="MOBILE_PACKAGING_GUIDE.md"
                className="py-2 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-600 font-bold text-xs flex items-center gap-1.5 transition cursor-pointer"
              >
                <BookOpen className="w-3.5 h-3.5" />
                <span>Guide (.md)</span>
              </a>
              <a
                href="/api/download/mobile-suite"
                download="grobaax-mobile-packaging-suite.zip"
                className="py-2 px-3.5 rounded-xl bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-md transition cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Download Suite (.zip)</span>
              </a>
            </div>
          </div>

          {/* Step-by-Step Instructions */}
          <div className="space-y-3 pt-2">
            <h4 className="font-extrabold text-xs text-white uppercase tracking-wider flex items-center gap-2">
              <Terminal className="w-4 h-4 text-emerald-400" />
              <span>How to Build APK, AAB &amp; iOS from Downloaded Package</span>
            </h4>
            
            <div className="space-y-2 text-slate-300">
              <div className="p-3 bg-slate-950/80 rounded-xl border border-slate-800 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-emerald-400">1. Build Android APK &amp; AAB</span>
                  <button
                    onClick={() => copyToClipboard('unzip grobaax-android-project.zip && cd grobaax-android/android && ./gradlew assembleDebug bundleRelease', 'apk_cmd')}
                    className="flex items-center gap-1 text-[10px] text-slate-400 hover:text-white"
                  >
                    {copiedCmd === 'apk_cmd' ? <CheckCircle2 className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                    <span>{copiedCmd === 'apk_cmd' ? 'Copied' : 'Copy'}</span>
                  </button>
                </div>
                <pre className="text-[10px] font-mono text-slate-200 overflow-x-auto whitespace-pre-wrap">
                  unzip grobaax-android-project.zip{'\n'}
                  cd grobaax-android/android{'\n'}
                  ./gradlew assembleDebug       # Produces: app/build/outputs/apk/debug/app-debug.apk{'\n'}
                  ./gradlew bundleRelease       # Produces: app/build/outputs/bundle/release/app-release.aab
                </pre>
              </div>

              <div className="p-3 bg-slate-950/80 rounded-xl border border-slate-800 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-blue-400">2. Build iOS Archive (Xcode)</span>
                  <button
                    onClick={() => copyToClipboard('unzip grobaax-ios-project.zip && cd grobaax-ios && npx cap open ios', 'ios_cmd')}
                    className="flex items-center gap-1 text-[10px] text-slate-400 hover:text-white"
                  >
                    {copiedCmd === 'ios_cmd' ? <CheckCircle2 className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                    <span>{copiedCmd === 'ios_cmd' ? 'Copied' : 'Copy'}</span>
                  </button>
                </div>
                <pre className="text-[10px] font-mono text-slate-200 overflow-x-auto whitespace-pre-wrap">
                  unzip grobaax-ios-project.zip{'\n'}
                  cd grobaax-ios{'\n'}
                  npx cap open ios               # Opens in Xcode, then Product &gt; Archive &gt; Distribute
                </pre>
              </div>
            </div>
          </div>

        </div>

        {/* Footer */}
        <div className="px-5 py-3.5 border-t border-slate-800 bg-slate-900/90 flex items-center justify-between shrink-0">
          <span className="text-[11px] text-slate-400">
            Package ID: <strong className="text-white">com.grobaax.app</strong>
          </span>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs transition cursor-pointer"
          >
            Close
          </button>
        </div>

      </div>
    </div>
  );

  return typeof document !== 'undefined' ? createPortal(modalContent, document.body) : null;
};
