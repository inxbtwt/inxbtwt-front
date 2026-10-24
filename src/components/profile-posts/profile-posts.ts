import { HttpErrorResponse } from '@angular/common/http';
import { DatePipe } from '@angular/common';
import { Component, effect, inject, input, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { finalize, Subscription } from 'rxjs';
import { Post } from '../dto/post/post';
import { ProfileImage } from '../profile-image/profile-image';
import { AuthService } from '../../services/auth.service';
import { PostService } from '../../services/post.service';

@Component({
  selector: 'app-profile-posts',
  imports: [DatePipe, RouterLink, ProfileImage],
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
  private page = -1;
  private failedPage = 0;
  private request?: Subscription;

  constructor() {
    effect((onCleanup) => {
      const userId = this.userId();
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
      .getByAuthor(userId, page)
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
