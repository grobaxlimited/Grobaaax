import React, { useState, useEffect } from 'react';
import { GroupBattleSeason, GroupBattleTeam, PRIMARY_SUPER_ADMIN_UID } from '../../types';
import { db, collection, getDocs, doc, setDoc, query, limit } from '../../lib/firebase';
import { Layers, Shield, Users, Plus, Edit3 } from 'lucide-react';

export function AdminGroupBattleView() {
  const [seasons, setSeasons] = useState<GroupBattleSeason[]>([]);

  useEffect(() => {
    const loadSeasons = async () => {
      try {
        const snapshot = await getDocs(query(collection(db, 'groupBattleSeasons'), limit(20)));
        const loaded: GroupBattleSeason[] = [];
        snapshot.forEach((docSnap) => loaded.push({ id: docSnap.id, ...docSnap.data() } as any));
        setSeasons(loaded);
      } catch (err) {
        console.warn('Group battle seasons fetch error:', err);
      }
    };
    loadSeasons();
  }, []);

  return (
    <div className="space-y-6">
      <div className="p-6 rounded-2xl bg-gradient-to-r from-pink-900 via-blue-900 to-slate-900 text-white flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Layers className="w-7 h-7 text-pink-400" /> Group Battle / Team Search Management
          </h1>
          <p className="text-xs text-pink-200 mt-1">
            Separate backend management for team battle competitions, rosters, and match schedules.
          </p>
        </div>
      </div>

      <div className="p-6 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 text-xs">
        <h3 className="font-bold text-sm text-slate-900 dark:text-white mb-2">Team Battles Active Seasons</h3>
        <p className="text-slate-400">Manage registered institution teams, match pairings, and standings.</p>
      </div>
    </div>
  );
}
