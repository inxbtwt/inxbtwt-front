import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { map, Subject, switchMap, tap } from 'rxjs';
import { ApiResponse } from '../components/dto/api/api-response';
import { CsrfToken } from '../components/dto/auth/csrf-token';
import {
  FriendAction,
  FriendTab,
  Friendship,
  FriendshipPage,
} from '../components/dto/friendship/friendship';

@Injectable({ providedIn: 'root' })
export class FriendshipService {
  private readonly http = inject(HttpClient);
  private readonly updates = new Subject<Friendship>();
  readonly changes = this.updates.asObservable();

  getState(userId: string) {
    return this.http
      .get<ApiResponse<Friendship>>(`/api/friendships/${encodeURIComponent(userId)}`, {
        withCredentials: true,
      })
      .pipe(map((response) => response.data));
  }

  getList(tab: FriendTab, page = 0) {
    return this.http
      .get<ApiResponse<FriendshipPage>>(
        tab === 'FRIENDS' ? '/api/friendships' : '/api/friendships/requests',
        {
          params: tab === 'FRIENDS' ? { page, size: 20 } : { page, size: 20, direction: tab },
          withCredentials: true,
        },
      )
      .pipe(map((response) => response.data));
  }

  countFriends() {
    return this.http
      .get<ApiResponse<{ count: number }>>('/api/friendships/count', { withCredentials: true })
      .pipe(map((response) => response.data.count));
  }

  act(userId: string, action: FriendAction) {
    const method =
      action === 'request'
        ? 'POST'
        : action === 'cancel' || action === 'remove'
          ? 'DELETE'
          : 'PATCH';
    const suffix = action === 'remove' ? '' : `/${action}`;
    return this.http.get<ApiResponse<CsrfToken>>('/api/auth/csrf', { withCredentials: true }).pipe(
      switchMap((csrf) =>
        this.http.request<ApiResponse<Friendship>>(
          method,
          `/api/friendships/${encodeURIComponent(userId)}${suffix}`,
          {
            headers: { [csrf.data.headerName]: csrf.data.token },
            withCredentials: true,
          },
        ),
      ),
      map((response) => response.data),
      tap((friendship) => this.updates.next(friendship)),
    );
  }
}
