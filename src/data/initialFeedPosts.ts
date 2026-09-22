import { Post } from '../types';

export const INITIAL_FEED_POSTS: Post[] = [];

export function isMockFeedPost(p: any): boolean {
  if (!p) return false;
  if (p.isMock) return true;
  const id = String(p.id || '');
  if (id.startsWith('post_seed_') || id === 'p0_ai' || id.startsWith('seed_')) return true;
  const username = p.author?.username || '';
  if (
    username === '@dr_vance_harvard' ||
    username === '@grbx_hq' ||
    username === '@ebuka_ui' ||
    username === '@fatima_abu' ||
    username === '@e_mensah_yaba' ||
    username === '@aisha_fce' ||
    username === '@grbx_admin'
  ) {
    return true;
  }
  return false;
}
