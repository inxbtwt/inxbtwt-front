export interface NotificationActor {
  userId: string;
  name: string;
  username: string;
  photoUrl: string | null;
}

export interface SiteNotification {
  notificationId: string;
  type:
    | 'POST_LIKED'
    | 'POST_REPOSTED'
    | 'POST_COMMENTED'
    | 'FRIEND_REQUEST_RECEIVED'
    | 'FRIEND_REQUEST_ACCEPTED'
    | 'SYSTEM';
  title: string;
  message: string;
  actor: NotificationActor | null;
  postId: string | null;
  postAvailable: boolean;
  createdAt: string;
  readAt: string | null;
  read: boolean;
}

export interface NotificationPage {
  content: SiteNotification[];
  page: number;
  size: number;
  hasNext: boolean;
  hasPrevious: boolean;
}
