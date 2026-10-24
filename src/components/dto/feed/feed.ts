import { Post } from '../post/post';

export interface Feed {
  strategy: string;
  content: Post[];
  page: number;
  size: number;
  hasNext: boolean;
  hasPrevious: boolean;
}
