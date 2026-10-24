import { ProfileSummary } from '../profile/profile-search';

export type FriendshipState = 'NONE' | 'REQUEST_SENT' | 'REQUEST_RECEIVED' | 'FRIENDS' | 'SELF';
export type FriendTab = 'FRIENDS' | 'RECEIVED' | 'SENT';
export type FriendAction = 'request' | 'accept' | 'decline' | 'cancel' | 'remove';

export interface Friendship {
  user: ProfileSummary;
  state: FriendshipState;
  requestedAt: string | null;
  acceptedAt: string | null;
}

export interface FriendshipPage {
  content: Friendship[];
  page: number;
  size: number;
  hasNext: boolean;
  hasPrevious: boolean;
}
