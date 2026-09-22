import {
  ChatroomLiveMessage,
  ChatroomLiveQuestion,
  ChatroomLiveCompetition,
  ChatroomLiveSettings,
} from '../types';

export const DEFAULT_CHATROOM_SETTINGS: ChatroomLiveSettings = {
  allowFreeUsersToParticipate: true,
  premiumRequiredForRewards: true,
  defaultWinnerCount: 5,
  defaultGpRewardPerWinner: 200,
  competitionScheduleNotice: 'Daily Chatroom Live competition: Monday–Friday at 7:00 PM (WAT). 200 GP per winner!',
  isChatMuted: false,
  mutedUserIds: [],
};

export const MOCK_CHATROOM_QUESTIONS: ChatroomLiveQuestion[] = [];

export function isMockChatroomMessage(m: any): boolean {
  if (!m) return false;
  if (m.isMock) return true;
  const id = String(m.id || '');
  if (id.startsWith('msg_0') || id.startsWith('seed_') || id.startsWith('mock_')) return true;
  if (
    m.userId === 'usr_admin_barns' ||
    m.userId === 'usr_moooooad2' ||
    m.userId === 'usr_shubham' ||
    m.userId === 'usr_06_amina'
  ) {
    return true;
  }
  return false;
}

export const MOCK_CHATROOM_MESSAGES: ChatroomLiveMessage[] = [];

export const MOCK_CHATROOM_COMPETITIONS: ChatroomLiveCompetition[] = [];
