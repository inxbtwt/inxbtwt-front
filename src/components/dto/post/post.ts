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
}

export interface PostPage {
  content: Post[];
  page: number;
  size: number;
  hasNext: boolean;
  hasPrevious: boolean;
}
