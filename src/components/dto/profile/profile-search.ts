export interface ProfileSearchResult {
  name: string;
  username: string;
  photoUrl: string | null;
}

export interface ProfileSummary extends ProfileSearchResult {
  userId: string;
}

export interface ProfileView extends ProfileSummary {
  friendCount: number;
  bio: string | null;
  coverUrl: string | null;
  createdAt: string | null;
}

export interface ProfileSearchPage {
  content: ProfileSearchResult[];
  number: number;
  totalPages: number;
  totalElements: number;
}
