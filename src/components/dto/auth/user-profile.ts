export interface UserProfile {
  profileId: number | null;
  userId: string;
  friendCount: number;
  bio: string | null;
  coverUrl: string | null;
}
