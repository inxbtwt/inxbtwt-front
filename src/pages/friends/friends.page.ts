import { DatePipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, DestroyRef, effect, inject, signal, untracked } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { finalize, Subscription } from 'rxjs';
import { FriendTab, Friendship } from '../../components/dto/friendship/friendship';
import { FriendshipActions } from '../../components/friendship-actions/friendship-actions';
import { NotificationBell } from '../../components/notification-bell/notification-bell';
import { ProfileImage } from '../../components/profile-image/profile-image';
import { ProfileSearch } from '../../components/profile-search/profile-search';
import { FriendshipService } from '../../services/friendship.service';

@Component({
  selector: 'app-friends-page',
  imports: [DatePipe, RouterLink, FriendshipActions, NotificationBell, ProfileImage, ProfileSearch],
  templateUrl: './friends.page.html',
  styleUrl: './friends.page.scss',
})
export class FriendsPage {
  private readonly friends = inject(FriendshipService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly route = inject(ActivatedRoute);
  protected readonly tab = signal<FriendTab>(
    this.route.snapshot.queryParamMap.get('tab') === 'received'
      ? 'RECEIVED'
      : this.route.snapshot.queryParamMap.get('tab') === 'sent'
        ? 'SENT'
        : 'FRIENDS',
  );
  protected readonly tabs: { key: FriendTab; label: string }[] = [
    { key: 'FRIENDS', label: 'Amigos' },
    { key: 'RECEIVED', label: 'Recebidas' },
    { key: 'SENT', label: 'Enviadas' },
  ];
  protected readonly items = signal<Friendship[]>([]);
  protected readonly count = signal<number | null>(null);
  protected readonly loading = signal(false);
  protected readonly error = signal('');
  protected readonly hasNext = signal(false);
  private page = -1;
  private failedPage = 0;
  private request?: Subscription;
  private countRequest?: Subscription;

  constructor() {
    effect((onCleanup) => {
      this.tab();
      this.items.set([]);
      this.page = -1;
      this.hasNext.set(false);
      untracked(() => this.load());
      onCleanup(() => this.request?.unsubscribe());
    });
    this.refreshCount();
    this.destroyRef.onDestroy(() => this.countRequest?.unsubscribe());
    this.friends.changes.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((relationship) => {
      const state =
        this.tab() === 'FRIENDS'
          ? 'FRIENDS'
          : this.tab() === 'RECEIVED'
            ? 'REQUEST_RECEIVED'
            : 'REQUEST_SENT';
      this.items.update((items) =>
        items.flatMap((item) =>
          item.user.userId !== relationship.user.userId
            ? [item]
            : relationship.state === state
              ? [relationship]
              : [],
        ),
      );
      this.refreshCount();
    });
  }

  private refreshCount(): void {
    this.countRequest?.unsubscribe();
    this.countRequest = this.friends
      .countFriends()
      .subscribe({ next: (count) => this.count.set(count), error: () => this.count.set(null) });
  }

  protected load(reset = true): void {
    if (!reset && (this.loading() || !this.hasNext())) return;
    this.request?.unsubscribe();
    const page = reset ? 0 : this.page + 1;
    this.failedPage = page;
    this.loading.set(true);
    this.error.set('');
    this.request = this.friends
      .getList(this.tab(), page)
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: (result) => {
          if (reset) this.items.set(result.content);
          else {
            const ids = new Set(this.items().map((item) => item.user.userId));
            this.items.update((items) => [
              ...items,
              ...result.content.filter((item) => !ids.has(item.user.userId)),
            ]);
          }
          this.page = result.page;
          this.hasNext.set(result.hasNext);
        },
        error: (error: HttpErrorResponse) =>
          this.error.set(
            error.status === 401
              ? 'Sua sessão expirou. Entre novamente.'
              : 'Não foi possível carregar os amigos e solicitações. Tente novamente.',
          ),
      });
  }

  protected retry(): void {
    this.load(this.failedPage === 0);
  }
}
