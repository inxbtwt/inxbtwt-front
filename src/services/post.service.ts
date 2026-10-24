import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { map, switchMap } from 'rxjs';
import { ApiResponse } from '../components/dto/api/api-response';
import { CsrfToken } from '../components/dto/auth/csrf-token';
import { Post, PostPage } from '../components/dto/post/post';

@Injectable({ providedIn: 'root' })
export class PostService {
  private readonly http = inject(HttpClient);

  getByAuthor(authorId: string, page = 0) {
    return this.http
      .get<ApiResponse<PostPage>>('/api/posts', {
        params: { authorId, page, size: 20 },
        withCredentials: true,
      })
      .pipe(map((response) => response.data));
  }

  createPost(content: string) {
    return this.http
      .get<ApiResponse<CsrfToken>>('/api/auth/csrf', {
        withCredentials: true,
      })
      .pipe(
        switchMap((response) =>
          this.http.post<ApiResponse<Post>>(
            '/api/posts',
            { content },
            {
              headers: { [response.data.headerName]: response.data.token },
              withCredentials: true,
            },
          ),
        ),
        map((response) => response.data),
      );
  }
}
