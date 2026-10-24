import { HttpClient } from '@angular/common/http';
import { inject, Injectable, signal } from '@angular/core';
import { map, Subject, switchMap, tap } from 'rxjs';
import { ApiResponse } from '../components/dto/api/api-response';
import { CsrfToken } from '../components/dto/auth/csrf-token';
import { NotificationPage, SiteNotification } from '../components/dto/notification/notification';

@Injectable({ providedIn: 'root' })
export class NotificationService {
  private readonly http = inject(HttpClient);
  private readonly unread = signal<number | null>(null);
  private readonly countRequests = new Subject<void>();
  readonly unreadCount = this.unread.asReadonly();
  readonly countRefresh = this.countRequests.asObservable();

  resetCount(): void {
    this.unread.set(null);
  }

  requestCountRefresh(): void {
    this.countRequests.next();
  }

  fetchUnreadCount() {
    return this.http
      .get<ApiResponse<{ count: number }>>('/api/notifications/unread-count', {
        withCredentials: true,
      })
      .pipe(
        map((response) => response.data.count),
        tap((count) => this.unread.set(count)),
      );
  }

  getNotifications(page = 0) {
    return this.http
      .get<ApiResponse<NotificationPage>>('/api/notifications', {
        params: { page, size: 20 },
        withCredentials: true,
      })
      .pipe(map((response) => response.data));
  }

  markAsRead(notificationId: string) {
    return this.patch<SiteNotification>(
      `/api/notifications/${encodeURIComponent(notificationId)}/read`,
    );
  }

  markAllAsRead() {
    return this.patch<void>('/api/notifications/read-all');
  }

  private patch<T>(url: string) {
    return this.http.get<ApiResponse<CsrfToken>>('/api/auth/csrf', { withCredentials: true }).pipe(
      switchMap((csrf) =>
        this.http.patch<ApiResponse<T>>(url, null, {
          headers: { [csrf.data.headerName]: csrf.data.token },
          withCredentials: true,
        }),
      ),
      map((response) => response.data),
      tap(() => this.requestCountRefresh()),
    );
  }
}
