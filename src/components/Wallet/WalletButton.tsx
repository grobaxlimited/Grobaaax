import React from 'react';
import { useApp } from '../../context/AppContext';
import { Wallet, Sparkles, Eye, EyeOff } from 'lucide-react';

interface WalletButtonProps {
  className?: string;
  showIcon?: boolean;
}

export const WalletButton: React.FC<WalletButtonProps> = ({ className = '', showIcon = true }) => {
  const { currentUser, setIsWalletModalOpen, isBalanceHidden, toggleBalanceHidden } = useApp();

  const formattedBalance = (
    typeof currentUser.gpBalance === 'number' ? currentUser.gpBalance : Number(currentUser.gpBalance || 0)
  ).toLocaleString();

  return (
    <div className={`inline-flex items-center rounded-xl bg-gradient-to-r from-blue-950/20 via-blue-900/15 to-blue-800/20 hover:from-blue-950/30 hover:to-blue-800/30 border border-blue-700/40 text-blue-900 dark:text-blue-300 shadow-xs transition-all ${className}`}>
      <button
        onClick={() => setIsWalletModalOpen(true)}
        className="inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 font-extrabold text-xs cursor-pointer group"
        title="View Account, Wallet & GP Balance"
      >
        {showIcon && (
          <div className="w-5 h-5 rounded-full bg-blue-500/20 group-hover:bg-blue-500/30 flex items-center justify-center shrink-0 transition-colors">
            <Wallet className="w-3 h-3 text-blue-500" />
          </div>
        )}
        <span className="font-black text-slate-900 dark:text-white tracking-wide">
          {isBalanceHidden ? '••••' : formattedBalance}
        </span>
        <span className="text-[10px] text-blue-500 uppercase font-black tracking-wider flex items-center gap-0.5">
          GP <Sparkles className="w-2.5 h-2.5 text-amber-400 inline" />
        </span>
      </button>

      {/* Quick Privacy Eye Toggle */}
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          toggleBalanceHidden();
        }}
        className="pr-2 py-1.5 text-slate-400 hover:text-blue-500 dark:hover:text-blue-400 transition-colors cursor-pointer"
        title={isBalanceHidden ? 'Reveal GP Balance' : 'Hide GP Balance (Private Mode)'}
        aria-label="Toggle balance privacy"
      >
        {isBalanceHidden ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
      </button>
    </div>
  );
};

