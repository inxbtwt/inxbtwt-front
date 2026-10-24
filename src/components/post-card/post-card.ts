import { HttpErrorResponse } from '@angular/common/http';
import { DatePipe } from '@angular/common';
import {
  Component,
  computed,
  DestroyRef,
  effect,
  inject,
  input,
  signal,
  untracked,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { finalize, Subscription } from 'rxjs';
import { Post } from '../dto/post/post';
import { PostMedia } from '../post-media/post-media';
import { ProfileImage } from '../profile-image/profile-image';
import { AuthService } from '../../services/auth.service';
import { PostService } from '../../services/post.service';

@Component({
  selector: 'app-post-card',
  imports: [DatePipe, FormsModule, RouterLink, ProfileImage, PostMedia],
  templateUrl: './post-card.html',
  styleUrl: './post-card.scss',
})
export class PostCard {
  readonly post = input.required<Post>();
  readonly detail = input(false);
  private readonly router = inject(Router);
  protected readonly auth = inject(AuthService);
  private readonly publications = inject(PostService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly patched = signal<Post | null>(null);
  protected readonly current = computed(() => this.patched() ?? this.post());
  protected readonly busy = signal(false);
  protected readonly actionError = signal('');
  protected readonly commentsOpen = signal(false);
  protected readonly comments = signal<Post[]>([]);
  protected readonly commentsLoading = signal(false);
  protected readonly commentsError = signal('');
  protected readonly moreComments = signal(false);
  protected readonly commenting = signal(false);
  protected readonly commentError = signal('');
  protected readonly commentSuccess = signal('');
  protected commentDraft = '';
  protected editDraft = '';
  protected readonly menuOpen = signal(false);
  protected readonly editing = signal(false);
  protected readonly confirmingDelete = signal(false);

  private commentsPage = -1;
  private commentsRequest?: Subscription;

  constructor() {
    effect(() => {
      this.post();
      this.patched.set(null);
      if (this.detail()) {
        this.commentsOpen.set(true);
        untracked(() => this.loadComments());
      }
    });
    this.publications.changes.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((post) => {
      const displayed = this.current();
      if (post.postId === displayed.postId) {
        this.patched.set({
          ...post,
          repostedBy: displayed.repostedBy,
          activityAt: displayed.activityAt,
        });
      } else if (displayed.parent?.postId === post.postId) {
        this.patched.set({
          ...displayed,
          parent: { ...displayed.parent, content: post.content },
        });
      }
      this.comments.update((comments) =>
        comments.map((comment) => (comment.postId === post.postId ? post : comment)),
      );
    });
    this.publications.removals.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(({ postId }) => {
      this.comments.update((comments) => comments.filter((comment) => comment.postId !== postId));
      const displayed = this.current();
      if (displayed.parent?.postId === postId) {
        this.patched.set({
          ...displayed,
          parent: { ...displayed.parent, content: 'Publicação removida.' },
        });
      }
    });
    this.destroyRef.onDestroy(() => this.commentsRequest?.unsubscribe());
  }

  protected startEdit(): void {
    if (this.busy() || this.commenting()) return;
    this.editDraft = this.current().content;
    this.editing.set(true);
    this.confirmingDelete.set(false);
    this.menuOpen.set(false);
    this.actionError.set('');
  }

  protected requestDelete(): void {
    if (this.busy() || this.commenting()) return;
    this.confirmingDelete.set(true);
    this.editing.set(false);
    this.menuOpen.set(false);
    this.actionError.set('');
  }

  protected saveEdit(): void {
    const post = this.current();
    const content = this.editDraft.trim();
    if (this.busy() || this.commenting() || (!content && !post.media?.length)) return;
    if (content === post.content) {
      this.editing.set(false);
      return;
    }
    this.busy.set(true);
    this.actionError.set('');
    this.publications
      .updatePost(post.postId, content)
      .pipe(
        finalize(() => this.busy.set(false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: () => this.editing.set(false),
        error: (error: HttpErrorResponse) =>
          this.actionError.set(
            error.error?.message || 'Não foi possível editar a publicação. Seu texto foi mantido.',
          ),
      });
  }

  protected deletePost(): void {
    if (this.busy() || this.commenting() || !this.confirmingDelete()) return;
    this.busy.set(true);
    this.actionError.set('');
    this.publications
      .deletePost(this.current().postId)
      .pipe(
        finalize(() => this.busy.set(false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: () => this.confirmingDelete.set(false),
        error: (error: HttpErrorResponse) =>
          this.actionError.set(
            error.error?.message || 'Não foi possível excluir a publicação. Tente novamente.',
          ),
      });
  }

  protected like(): void {
    if (this.busy() || this.commenting() || this.editing() || this.confirmingDelete()) return;
    this.busy.set(true);
    this.actionError.set('');
    const post = this.current();
    this.publications
      .setLike(post.postId, !post.liked)
      .pipe(
        finalize(() => this.busy.set(false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        error: () => this.actionError.set('Não foi possível atualizar a curtida. Tente novamente.'),
      });
  }

  protected repost(): void {
    if (this.busy() || this.commenting() || this.editing() || this.confirmingDelete()) return;
    this.busy.set(true);
    this.actionError.set('');
    const post = this.current();
    this.publications
      .setRepost(post.postId, !post.reposted)
      .pipe(
        finalize(() => this.busy.set(false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        error: () => this.actionError.set('Não foi possível atualizar o repost. Tente novamente.'),
      });
  }

  protected openPost(event?: Event): void {
    if (this.detail() || this.editing() || this.confirmingDelete()) return;
    const target = event?.target;
    if (target instanceof Element && target.closest('a, button, input, textarea, form, .comments'))
      return;
    if (event?.type === 'keydown' && event.target !== event.currentTarget) return;
    if (window.getSelection()?.toString()) return;
    event?.preventDefault();
    void this.router.navigate(['/posts', this.current().postId]);
  }

  protected toggleComments(): void {
    if (!this.detail()) {
      void this.router.navigate(['/posts', this.current().postId]);
      return;
    }
    this.commentsOpen.update((open) => !open);
    if (this.commentsOpen()) this.loadComments();
  }

  protected loadComments(reset = true): void {
    if (!reset && (this.commentsLoading() || !this.moreComments())) return;
    this.commentsRequest?.unsubscribe();
    const page = reset ? 0 : this.commentsPage + 1;
    const previousIds = new Set(this.comments().map((comment) => comment.postId));
    this.commentsLoading.set(true);
    this.commentsError.set('');
    this.commentsRequest = this.publications
      .getComments(this.current().postId, page)
      .pipe(finalize(() => this.commentsLoading.set(false)))
      .subscribe({
        next: (result) => {
          if (reset) {
            const addedDuringRequest = this.comments().filter(
              (comment) => !previousIds.has(comment.postId),
            );
            const addedIds = new Set(addedDuringRequest.map((comment) => comment.postId));
            this.comments.set([
              ...addedDuringRequest,
              ...result.content.filter((comment) => !addedIds.has(comment.postId)),
            ]);
          } else {
            const ids = new Set(this.comments().map((comment) => comment.postId));
            this.comments.update((comments) => [
              ...comments,
              ...result.content.filter((comment) => !ids.has(comment.postId)),
            ]);
          }
          this.commentsPage = result.page;
          this.moreComments.set(result.hasNext);
        },
        error: () =>
          this.commentsError.set('Não foi possível carregar os comentários. Tente novamente.'),
      });
  }

  protected sendComment(): void {
    const content = this.commentDraft.trim();
    if (!content || this.commenting() || this.busy()) return;
    this.commenting.set(true);
    this.commentError.set('');
    this.commentSuccess.set('');
    this.publications
      .comment(this.current().postId, content)
      .pipe(
        finalize(() => this.commenting.set(false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: ({ comment }) => {
          this.commentDraft = '';
          this.commentSuccess.set('Comentário publicado.');
          this.comments.update((comments) => [
            comment,
            ...comments.filter((existing) => existing.postId !== comment.postId),
          ]);
          if (this.commentsPage < 0 && !this.commentsLoading()) this.moreComments.set(true);
        },
        error: (error: HttpErrorResponse) =>
          this.commentError.set(
            error.status === 400
              ? error.error?.message || 'Confira o comentário.'
              : 'Não foi possível comentar. Seu texto foi mantido para tentar novamente.',
          ),
      });
  }
}
