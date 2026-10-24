import { HttpErrorResponse } from '@angular/common/http';
import { DatePipe } from '@angular/common';
import { Component, computed, DestroyRef, inject, OnInit, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Router, RouterLink } from '@angular/router';
import { finalize, Subscription } from 'rxjs';
import { SiteNotification } from '../../components/dto/notification/notification';
import { NotificationBell } from '../../components/notification-bell/notification-bell';
import { ProfileImage } from '../../components/profile-image/profile-image';
import { ProfileSearch } from '../../components/profile-search/profile-search';
import { AuthService } from '../../services/auth.service';
import { NotificationService } from '../../services/notification.service';

@Component({
  selector: 'app-notifications-page',
  imports: [DatePipe, RouterLink, NotificationBell, ProfileImage, ProfileSearch],
  templateUrl: './notifications.page.html',
  styleUrl: './notifications.page.scss',
})
export class NotificationsPage implements OnInit {
  private readonly notifications = inject(NotificationService);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);
  protected readonly auth = inject(AuthService);
  protected readonly items = signal<SiteNotification[]>([]);
  protected readonly loading = signal(false);
  protected readonly error = signal('');
  protected readonly actionError = signal('');
  protected readonly pending = signal<string | null>(null);
  protected readonly markingAll = signal(false);
  protected readonly hasNext = signal(false);
  protected readonly unreadCount = this.notifications.unreadCount;
  protected readonly hasUnread = computed(
    () => !!this.unreadCount() || this.items().some((item) => !item.read),
  );
  private page = -1;
  private failedPage = 0;
  private request?: Subscription;

  ngOnInit(): void {
    this.load();
    this.destroyRef.onDestroy(() => this.request?.unsubscribe());
  }

  protected load(reset = true): void {
    if (this.pending() || this.markingAll() || (!reset && (this.loading() || !this.hasNext())))
      return;
    this.request?.unsubscribe();
    const page = reset ? 0 : this.page + 1;
    this.failedPage = page;
    this.loading.set(true);
    this.error.set('');
    this.request = this.notifications
      .getNotifications(page)
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: (result) => {
          if (reset) this.items.set(result.content);
          else {
            const ids = new Set(this.items().map((item) => item.notificationId));
            this.items.update((items) => [
              ...items,
              ...result.content.filter((item) => !ids.has(item.notificationId)),
            ]);
          }
          this.page = result.page;
          this.hasNext.set(result.hasNext);
          this.notifications.requestCountRefresh();
        },
        error: (error: HttpErrorResponse) =>
          this.error.set(
            error.status === 401
              ? 'Sua sessão expirou. Entre novamente para ver as notificações.'
              : 'Não foi possível carregar as notificações. Tente novamente.',
          ),
      });
  }

  protected retry(): void {
    this.load(this.failedPage === 0);
  }

  protected markRead(item: SiteNotification, openPost = false): void {
    if (this.loading() || this.pending() || this.markingAll()) return;
    if (item.read) {
      if (openPost) this.openTarget(item);
      return;
    }
    this.pending.set(item.notificationId);
    this.actionError.set('');
    this.notifications
      .markAsRead(item.notificationId)
      .pipe(
        finalize(() => this.pending.set(null)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (updated) => {
          this.items.update((items) =>
            items.map((current) =>
              current.notificationId === updated.notificationId ? updated : current,
            ),
          );
          if (openPost) this.openTarget(updated);
        },
        error: () =>
          this.actionError.set('Não foi possível marcar a notificação como lida. Tente novamente.'),
      });
  }

  private openTarget(item: SiteNotification): void {
    if (item.type === 'FRIEND_REQUEST_RECEIVED') {
      void this.router.navigate(['/friends'], { queryParams: { tab: 'received' } });
    } else if (item.type === 'FRIEND_REQUEST_ACCEPTED') {
      void this.router.navigate(['/friends']);
    } else if (item.postId && item.postAvailable) {
      void this.router.navigate(['/posts', item.postId]);
    }
  }

  protected markAllRead(): void {
    if (this.loading() || this.pending() || this.markingAll() || !this.hasUnread()) return;
    this.markingAll.set(true);
    this.actionError.set('');
    this.notifications
      .markAllAsRead()
      .pipe(
        finalize(() => this.markingAll.set(false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: () =>
          this.items.update((items) =>
            items.map((item) =>
              item.read ? item : { ...item, read: true, readAt: new Date().toISOString() },
            ),
          ),
        error: () =>
          this.actionError.set('Não foi possível marcar todas como lidas. Tente novamente.'),
      });
  }
}
