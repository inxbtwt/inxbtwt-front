import { Component, effect, inject, signal } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { catchError, EMPTY, switchMap, filter, fromEvent, merge, tap, timer } from 'rxjs';
import { AuthService } from '../../services/auth.service';
import { NotificationService } from '../../services/notification.service';

@Component({
  selector: 'app-notification-bell',
  imports: [RouterLink, RouterLinkActive],
  template: `
    <a
      routerLink="/notifications"
      routerLinkActive="active"
      ariaCurrentWhenActive="page"
      [attr.aria-label]="
        failed()
          ? 'Notificações, contagem indisponível'
          : count() === null
            ? 'Notificações'
            : 'Notificações, ' + count() + ' não lidas'
      "
      title="Notificações"
    >
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M18 9a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9ZM10 21h4" />
      </svg>
      @if (count(); as unread) {
        <span class="badge" aria-hidden="true">{{ unread > 99 ? '99+' : unread }}</span>
      }
    </a>
  `,
  styles: `
    :host {
      display: inline-flex;
      flex-shrink: 0;
    }
    a {
      position: relative;
      display: grid;
      place-items: center;
      width: 40px;
      height: 40px;
      border: 1px solid #e5e2d9;
      border-radius: 10px;
      color: #111;
      background: #fffefa;
      text-decoration: none;
    }
    a:hover,
    a.active {
      background: #d4ff3f;
    }
    a:focus-visible {
      outline: 3px solid #9bc300;
      outline-offset: 3px;
    }
    svg {
      width: 20px;
      height: 20px;
      fill: none;
      stroke: currentColor;
      stroke-width: 1.7;
      stroke-linecap: round;
      stroke-linejoin: round;
    }
    .badge {
      position: absolute;
      top: -5px;
      right: -5px;
      min-width: 18px;
      min-height: 18px;
      box-sizing: border-box;
      padding: 2px 4px;
      border-radius: 12px;
      background: #9c3340;
      color: white;
      font:
        bold 10px Arial,
        sans-serif;
      text-align: center;
    }
  `,
})
export class NotificationBell {
  private readonly auth = inject(AuthService);
  private readonly notifications = inject(NotificationService);
  protected readonly count = this.notifications.unreadCount;
  protected readonly failed = signal(false);

  constructor() {
    effect((onCleanup) => {
      const userId = this.auth.currentUser()?.userId;
      this.notifications.resetCount();
      this.failed.set(false);
      if (!userId) return;
      const request = merge(
        timer(0, 30_000),
        fromEvent(window, 'focus'),
        fromEvent(document, 'visibilitychange'),
        this.notifications.countRefresh,
      )
        .pipe(
          filter(() => document.visibilityState === 'visible'),
          switchMap(() =>
            this.notifications.fetchUnreadCount().pipe(
              tap(() => this.failed.set(false)),
              catchError(() => {
                this.failed.set(true);
                return EMPTY;
              }),
            ),
          ),
        )
        .subscribe();
      onCleanup(() => request.unsubscribe());
    });
  }
}
