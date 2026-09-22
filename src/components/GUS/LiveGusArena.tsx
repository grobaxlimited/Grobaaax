import React from 'react';
import { LiveGusRoom } from './LiveGusRoom';

interface LiveGusArenaProps {
  season?: any;
  competitionId?: string;
  onExit: () => void;
}

export const LiveGusArena: React.FC<LiveGusArenaProps> = ({ competitionId, onExit }) => {
  return <LiveGusRoom competitionId={competitionId} onExit={onExit} />;
};
