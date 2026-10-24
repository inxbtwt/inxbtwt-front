import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { map } from 'rxjs';
import { ApiResponse } from '../components/dto/api/api-response';
import { Feed } from '../components/dto/feed/feed';

@Injectable({ providedIn: 'root' })
export class FeedService {
  private readonly http = inject(HttpClient);

  getFeed(page = 0, strategy?: string) {
    const params: Record<string, string | number> = { page, size: 20 };
    if (strategy) params['strategy'] = strategy;
    return this.http
      .get<ApiResponse<Feed>>('/api/feed', {
        params,
        withCredentials: true,
      })
      .pipe(map((response) => response.data));
  }
}
