import { HttpErrorResponse } from '@angular/common/http';
import { Component, DestroyRef, effect, inject, input, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { finalize, Subscription } from 'rxjs';
import { Post, PostProfileTab } from '../dto/post/post';
import { PostCard } from '../post-card/post-card';
import { AuthService } from '../../services/auth.service';
import { PostService } from '../../services/post.service';

@Component({
  selector: 'app-profile-posts',
  imports: [PostCard],
  templateUrl: './profile-posts.html',
})
export class ProfilePosts {
  readonly userId = input.required<string>();
  private readonly publications = inject(PostService);
  protected readonly auth = inject(AuthService);
  protected readonly posts = signal<Post[]>([]);
  protected readonly loading = signal(false);
  protected readonly error = signal('');
  protected readonly hasNext = signal(false);
  protected readonly tab = signal<PostProfileTab>('PUBLICATIONS');
  protected readonly tabs: { key: PostProfileTab; label: string }[] = [
    { key: 'PUBLICATIONS', label: 'Publicações' },
    { key: 'REPLIES', label: 'Respostas' },
    { key: 'LIKES', label: 'Curtidas' },
  ];
  private page = -1;
  private failedPage = 0;
  private request?: Subscription;

  constructor() {
    this.publications.activityChanges
      .pipe(takeUntilDestroyed(inject(DestroyRef)))
      .subscribe((event) => {
        if (this.userId() !== this.auth.currentUser()?.userId) return;
        const affectsTab =
          (event.type === 'LIKE' && this.tab() === 'LIKES') ||
          (event.type === 'REPOST' && this.tab() === 'PUBLICATIONS') ||
          (event.type === 'COMMENT' && this.tab() === 'REPLIES');
        if (affectsTab) this.load();
      });
    effect((onCleanup) => {
      const userId = this.userId();
      this.tab();
      this.request?.unsubscribe();
      this.posts.set([]);
      this.page = -1;
      this.hasNext.set(false);
      this.error.set('');
      if (userId) this.load();
      onCleanup(() => this.request?.unsubscribe());
    });
  }

  protected load(reset = true): void {
    if (!reset && (this.loading() || !this.hasNext())) return;
    const userId = this.userId();
    if (!userId) return;
    this.request?.unsubscribe();
    const page = reset ? 0 : this.page + 1;
    this.failedPage = page;
    this.loading.set(true);
    this.error.set('');
    this.request = this.publications
      .getByAuthor(userId, page, this.tab())
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: (result) => {
          if (reset) {
            this.posts.set(result.content);
          } else {
            const existing = new Set(this.posts().map((post) => post.postId));
            this.posts.update((posts) => [
              ...posts,
              ...result.content.filter((post) => !existing.has(post.postId)),
            ]);
          }
          this.page = result.page;
          this.hasNext.set(result.hasNext);
        },
        error: (error: HttpErrorResponse) =>
          this.error.set(
            error.status === 401
              ? 'Sua sessão expirou. Entre novamente para ver as publicações.'
              : 'Não foi possível carregar as publicações deste perfil. Tente novamente.',
          ),
      });
  }

  protected retry(): void {
    this.load(this.failedPage === 0);
  }
}
