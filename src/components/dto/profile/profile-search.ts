export interface ProfileSummary {
  userId: string;
  name: string;
  username: string;
  photoUrl: string | null;
}

export interface ProfileView extends ProfileSummary {
  bio: string | null;
  coverUrl: string | null;
  createdAt: string | null;
}

export interface ProfileSearchPage {
  content: ProfileSummary[];
  number: number;
  totalPages: number;
  totalElements: number;
}
