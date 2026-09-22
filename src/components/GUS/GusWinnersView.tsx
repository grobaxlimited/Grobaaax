import React from 'react';
import { useApp } from '../../context/AppContext';
import { Card } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { GusSeason, GusWinner, GusPrizeConfig } from '../../types';
import {
  Trophy,
  Award,
  Crown,
  Medal,
  Sparkles,
  ArrowLeft,
  ChevronRight,
  ShieldCheck,
  CheckCircle2,
} from 'lucide-react';

interface GusWinnersViewProps {
  season: GusSeason;
  onBack: () => void;
}

export const GusWinnersView: React.FC<GusWinnersViewProps> = ({ season, onBack }) => {
  const prizes = season.prizes || [];
  const winners = season.winners || [
    {
      id: 'w1',
      position: 1,
      positionTitle: '1st Place — Ultimate Scholar Champion',
      userId: 'usr_p1',
      userName: 'Chidi Nwosu',
      userAvatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
      institution: 'University of Lagos',
      gpAwarded: 100000,
      finalRoundReached: 3,
      finalScore: 100,
    },
    {
      id: 'w2',
      position: 2,
      positionTitle: '2nd Place — Global Laureate',
      userId: 'usr_p2',
      userName: 'Fatima Abubakar',
      userAvatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80',
      institution: 'Ahmadu Bello University',
      gpAwarded: 50000,
      finalRoundReached: 3,
      finalScore: 90,
    },
    {
      id: 'w3',
      position: 3,
      positionTitle: '3rd Place — Bronze Podium',
      userId: 'usr_student_04',
      userName: 'Chukwuebuka Obi',
      userAvatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
      institution: 'University of Ibadan',
      gpAwarded: 25000,
      finalRoundReached: 3,
      finalScore: 85,
    },
  ];

  const firstPlace = winners.find(w => w.position === 1);
  const secondPlace = winners.find(w => w.position === 2);
  const thirdPlace = winners.find(w => w.position === 3);

  return (
    <div className="space-y-5 pb-20 max-w-2xl mx-auto px-3 sm:px-4 pt-4 animate-fadeIn">
      {/* Header Bar */}
      <div className="flex items-center justify-between">
        <Button size="sm" variant="ghost" onClick={onBack} leftIcon={<ArrowLeft className="w-4 h-4" />}>
          Back
        </Button>
        <Badge variant="amber" size="md" icon={<Crown className="w-4 h-4" />}>
          Official Season Podium
        </Badge>
      </div>

      {/* Podium Banner */}
      <div className="rounded-3xl bg-gradient-to-b from-amber-950 via-slate-900 to-slate-950 border border-amber-500/40 p-6 text-center text-white space-y-4 shadow-xl">
        <div className="w-16 h-16 rounded-full bg-amber-500/20 border-2 border-amber-500/60 flex items-center justify-center mx-auto text-amber-400">
          <Trophy className="w-9 h-9" />
        </div>

        <div>
          <h2 className="text-xl font-black tracking-tight">{season.title} Champions</h2>
          <p className="text-xs text-slate-300 mt-1">
            Zero-knowledge grade verification and final elimination records certified on the Grobaax ledger.
          </p>
        </div>

        {/* Podium Visualization */}
        <div className="grid grid-cols-3 gap-2 pt-4 items-end max-w-md mx-auto text-xs">
          {/* 2nd Place */}
          {secondPlace && (
            <div className="space-y-2 text-center">
              <img
                src={secondPlace.userAvatar}
                alt={secondPlace.userName}
                className="w-12 h-12 rounded-full border-2 border-slate-300 mx-auto object-cover"
              />
              <div className="bg-slate-800/80 p-2.5 rounded-2xl border border-slate-700">
                <Medal className="w-4 h-4 text-slate-300 mx-auto mb-1" />
                <span className="font-extrabold block truncate text-[11px]">{secondPlace.userName}</span>
                <span className="text-[9px] text-slate-400 block truncate">{secondPlace.institution}</span>
                <span className="text-amber-400 font-bold text-[10px] block mt-1">+{secondPlace.gpAwarded.toLocaleString()} GP</span>
              </div>
            </div>
          )}

          {/* 1st Place */}
          {firstPlace && (
            <div className="space-y-2 text-center -mt-4">
              <div className="relative inline-block mx-auto">
                <Crown className="w-5 h-5 text-amber-400 absolute -top-4 left-1/2 -translate-x-1/2 animate-bounce" />
                <img
                  src={firstPlace.userAvatar}
                  alt={firstPlace.userName}
                  className="w-16 h-16 rounded-full border-2 border-amber-400 mx-auto object-cover ring-4 ring-amber-500/20"
                />
              </div>
              <div className="bg-gradient-to-b from-amber-950/80 to-slate-900 p-3 rounded-2xl border border-amber-500/50 shadow-lg">
                <Trophy className="w-5 h-5 text-amber-400 mx-auto mb-1" />
                <span className="font-black block truncate text-xs text-amber-300">{firstPlace.userName}</span>
                <span className="text-[10px] text-amber-200/80 block truncate">{firstPlace.institution}</span>
                <span className="text-amber-400 font-black text-xs block mt-1">+{firstPlace.gpAwarded.toLocaleString()} GP</span>
              </div>
            </div>
          )}

          {/* 3rd Place */}
          {thirdPlace && (
            <div className="space-y-2 text-center">
              <img
                src={thirdPlace.userAvatar}
                alt={thirdPlace.userName}
                className="w-12 h-12 rounded-full border-2 border-amber-700 mx-auto object-cover"
              />
              <div className="bg-slate-800/80 p-2.5 rounded-2xl border border-slate-700">
                <Award className="w-4 h-4 text-amber-600 mx-auto mb-1" />
                <span className="font-extrabold block truncate text-[11px]">{thirdPlace.userName}</span>
                <span className="text-[9px] text-slate-400 block truncate">{thirdPlace.institution}</span>
                <span className="text-amber-400 font-bold text-[10px] block mt-1">+{thirdPlace.gpAwarded.toLocaleString()} GP</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Prize Breakdown Table */}
      <div className="space-y-3">
        <h3 className="font-extrabold text-sm uppercase tracking-wider text-slate-900 dark:text-white flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-amber-400" /> Season Prize Distribution Structure
        </h3>

        <div className="space-y-2">
          {prizes.map((p, idx) => (
            <Card key={p.id || idx} className="p-3.5 flex items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center font-black text-amber-400 shrink-0">
                  #{p.position}
                </div>
                <div>
                  <h4 className="font-bold text-slate-900 dark:text-white">{p.positionTitle}</h4>
                  <p className="text-[10px] text-slate-400">{p.description}</p>
                </div>
              </div>

              <span className="font-black text-amber-500 dark:text-amber-400 shrink-0">
                +{p.gpReward.toLocaleString()} GP
              </span>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
};
