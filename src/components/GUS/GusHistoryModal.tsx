import React from 'react';
import { Card } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { MOCK_GUS_HISTORY } from '../../data/mockData';
import { X, Trophy, History, Calendar, Users, Award } from 'lucide-react';

interface GusHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const GusHistoryModal: React.FC<GusHistoryModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-md overflow-y-auto animate-fadeIn">
      <div className="relative w-full max-w-lg bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden text-white my-auto">
        {/* Header */}
        <div className="p-5 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center shrink-0">
              <History className="w-5 h-5 text-cyan-400" />
            </div>
            <div>
              <h3 className="text-base font-black tracking-tight">GUS Seasons Archive</h3>
              <p className="text-xs text-slate-400">Historical competition records & past champions</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800/80 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-3 max-h-[70vh] overflow-y-auto">
          {MOCK_GUS_HISTORY.map(item => (
            <Card key={item.id} className="p-4 bg-slate-950/80 border-slate-800 space-y-3">
              <div className="flex items-center justify-between">
                <Badge variant="cyan" size="sm" icon={<Calendar className="w-3 h-3" />}>
                  {item.date}
                </Badge>
                <Badge variant="emerald" size="sm">
                  Completed
                </Badge>
              </div>

              <div>
                <h4 className="font-extrabold text-sm text-white">{item.seasonTitle}</h4>
                <div className="flex items-center gap-3 text-xs text-slate-400 mt-1">
                  <span className="flex items-center gap-1">
                    <Users className="w-3.5 h-3.5 text-cyan-400" /> {item.totalParticipants.toLocaleString()} Participants
                  </span>
                  <span>•</span>
                  <span>{item.totalRounds} Elimination Rounds</span>
                </div>
              </div>

              <div className="p-3 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-1.5 text-xs">
                <div className="flex items-center justify-between text-amber-400 font-bold">
                  <span className="flex items-center gap-1 text-[11px] text-slate-400">
                    <Trophy className="w-3.5 h-3.5 text-amber-400" /> Champion
                  </span>
                  <span>{item.winner}</span>
                </div>
                <div className="flex items-center justify-between text-slate-300">
                  <span className="text-[11px] text-slate-400">Runner-Up</span>
                  <span>{item.runnerUp}</span>
                </div>
                <div className="flex items-center justify-between text-slate-300">
                  <span className="text-[11px] text-slate-400">3rd Place</span>
                  <span>{item.thirdPlace}</span>
                </div>
              </div>
            </Card>
          ))}
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-950 border-t border-slate-800 text-right">
          <Button variant="ghost" size="sm" onClick={onClose}>
            Close Archive
          </Button>
        </div>
      </div>
    </div>
  );
};
