export interface PostAuthor {
  userId: string;
  name: string;
  username: string;
  photoUrl: string | null;
}

export interface Post {
  postId: string;
  content: string;
  author: PostAuthor;
  createdAt: string;
  updatedAt: string;
  likeCount: number;
  repostCount: number;
  commentCount: number;
  liked: boolean;
  reposted: boolean;
  parent: { postId: string; content: string; author: PostAuthor } | null;
  repostedBy: PostAuthor | null;
  activityAt: string;
}

export interface PostPage {
  content: Post[];
  page: number;
  size: number;
  hasNext: boolean;
  hasPrevious: boolean;
}

export type PostProfileTab = 'PUBLICATIONS' | 'REPLIES' | 'LIKES';

export interface CommentCreated {
  comment: Post;
  post: Post;
}
