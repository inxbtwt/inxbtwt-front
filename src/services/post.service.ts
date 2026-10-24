import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { map, Observable, Subject, switchMap, tap } from 'rxjs';
import { ApiResponse } from '../components/dto/api/api-response';
import { CsrfToken } from '../components/dto/auth/csrf-token';
import { CommentCreated, Post, PostPage, PostProfileTab } from '../components/dto/post/post';

@Injectable({ providedIn: 'root' })
export class PostService {
  private readonly http = inject(HttpClient);
  private readonly updates = new Subject<Post>();
  private readonly activities = new Subject<{
    type: 'LIKE' | 'REPOST' | 'COMMENT';
    postId: string;
  }>();
  readonly changes = this.updates.asObservable();
  readonly activityChanges = this.activities.asObservable();

  getByAuthor(authorId: string, page = 0, tab: PostProfileTab = 'PUBLICATIONS') {
    return this.http
      .get<ApiResponse<PostPage>>('/api/posts', {
        params: { authorId, page, size: 20, tab },
        withCredentials: true,
      })
      .pipe(map((response) => response.data));
  }

  getPost(postId: string) {
    return this.http
      .get<ApiResponse<Post>>(`/api/posts/${encodeURIComponent(postId)}`, { withCredentials: true })
      .pipe(map((response) => response.data));
  }

  createPost(content: string) {
    return this.write<Post>('POST', '/api/posts', { content });
  }

  setLike(postId: string, liked: boolean) {
    return this.write<Post>(
      liked ? 'PUT' : 'DELETE',
      `/api/posts/${encodeURIComponent(postId)}/like`,
    ).pipe(tap((post) => this.notify(post, 'LIKE')));
  }

  setRepost(postId: string, reposted: boolean) {
    return this.write<Post>(
      reposted ? 'PUT' : 'DELETE',
      `/api/posts/${encodeURIComponent(postId)}/repost`,
    ).pipe(tap((post) => this.notify(post, 'REPOST')));
  }

  getComments(postId: string, page = 0) {
    return this.http
      .get<ApiResponse<PostPage>>(`/api/posts/${encodeURIComponent(postId)}/comments`, {
        params: { page, size: 20 },
        withCredentials: true,
      })
      .pipe(map((response) => response.data));
  }

  comment(postId: string, content: string) {
    return this.write<CommentCreated>('POST', `/api/posts/${encodeURIComponent(postId)}/comments`, {
      content,
    }).pipe(tap((result) => this.notify(result.post, 'COMMENT')));
  }

  private notify(post: Post, type: 'LIKE' | 'REPOST' | 'COMMENT'): void {
    this.updates.next(post);
    this.activities.next({ type, postId: post.postId });
  }

  private write<T>(method: 'POST' | 'PUT' | 'DELETE', url: string, body?: unknown): Observable<T> {
    return this.http.get<ApiResponse<CsrfToken>>('/api/auth/csrf', { withCredentials: true }).pipe(
      switchMap((response) =>
        this.http.request<ApiResponse<T>>(method, url, {
          body,
          headers: { [response.data.headerName]: response.data.token },
          withCredentials: true,
        }),
      ),
      map((response) => response.data),
    );
  }
}
