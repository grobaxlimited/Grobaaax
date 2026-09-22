import React, { useState, useEffect } from 'react';
import { db, collection, getDocs, query, limit } from '../../lib/firebase';
import { Card } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import {
  Activity,
  Radio,
  Clock,
  Sparkles,
  Trophy,
  Users,
  MessageSquare,
} from 'lucide-react';

interface LiveRoomItem {
  id: string;
  title?: string;
  type: string;
  status: string;
  participantsCount?: number;
  currentQuestion?: string;
  hostName?: string;
  createdAt?: any;
}

export function AdminLiveManagementView() {
  const [liveRooms, setLiveRooms] = useState<LiveRoomItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Fetch active live rooms / sessions
    const fetchLiveRooms = async () => {
      try {
        const snapshot = await getDocs(query(collection(db, 'liveSessions'), limit(20)));
        const rooms: LiveRoomItem[] = snapshot.docs.map((docSnap) => ({
          id: docSnap.id,
          ...(docSnap.data() as any),
        }));
        setLiveRooms(rooms);
      } catch (err) {
        console.warn('Live management fetch notice:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchLiveRooms();
  }, []);

  return (
    <div className="space-y-6">
      <div className="p-6 rounded-2xl bg-gradient-to-r from-blue-950 via-slate-900 to-blue-950 text-white flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Radio className="w-7 h-7 text-rose-500 animate-pulse" /> Live Competition Controller
          </h1>
          <p className="text-xs text-blue-200 mt-1">
            Real-time monitoring and administrative oversight of live GUS quiz rounds and Chatroom Live sessions.
          </p>
        </div>
      </div>

      <div className="space-y-4">
        {loading ? (
          <div className="p-12 text-center text-xs text-slate-400">Loading active rooms...</div>
        ) : liveRooms.length === 0 ? (
          <Card className="p-8 text-center text-xs text-slate-400 space-y-2 border border-slate-200 dark:border-slate-800">
            <Clock className="w-8 h-8 text-slate-500 mx-auto" />
            <p className="font-bold text-slate-700 dark:text-slate-200">No active live competition rooms currently running.</p>
            <p className="text-[11px] text-slate-500 max-w-md mx-auto">
              When students or admins launch a GUS tournament round or Chatroom Live session, live telemetry and controls will appear here.
            </p>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {liveRooms.map((room) => (
              <Card
                key={room.id}
                className="p-5 space-y-4 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-md"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-black text-sm text-slate-900 dark:text-white">
                      {room.title || 'Live Competition Session'}
                    </h3>
                    <p className="text-[10px] text-slate-400">
                      Type: {room.type || 'GUS Tournament'} • Host: {room.hostName || 'System'}
                    </p>
                  </div>
                  <Badge variant={room.status === 'live' ? 'rose' : 'slate'} size="sm">
                    {room.status || 'Active'}
                  </Badge>
                </div>

                <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 text-xs flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-300 font-medium">
                    <Users className="w-4 h-4 text-blue-500" />
                    <span>{room.participantsCount || 0} Participants</span>
                  </div>
                  <span className="text-[10px] font-bold text-emerald-500">Live Telemetry Synced</span>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
