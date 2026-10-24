import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { DatePipe } from '@angular/common';
import { Component, ElementRef, inject, OnDestroy, OnInit, signal, viewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { finalize, of, Subscription, switchMap } from 'rxjs';
import { ApiResponse } from '../../components/dto/api/api-response';
import { UserPhotoUrls } from '../../components/dto/auth/user-photo-urls';
import { ProfileSearch } from '../../components/profile-search/profile-search';
import { ProfileImage } from '../../components/profile-image/profile-image';
import { Post } from '../../components/dto/post/post';
import { FeedService } from '../../services/feed.service';
import { PostService } from '../../services/post.service';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-home-page',
  imports: [RouterLink, ProfileSearch, FormsModule, DatePipe, ProfileImage],
  templateUrl: './home.page.html',
  styleUrl: './home.page.scss',
})
export class HomePage implements OnInit, OnDestroy {
  private readonly http = inject(HttpClient);
  private photoRequest?: Subscription;
  protected readonly profilePhoto = signal('');
  protected readonly auth = inject(AuthService);
  protected readonly toastMessage = signal('');
  private readonly feeds = inject(FeedService);
  private readonly publications = inject(PostService);
  private feedRequest?: Subscription;
  private postRequest?: Subscription;
  private failedFeedPage = 0;
  protected readonly posts = signal<Post[]>([]);
  protected readonly loadingFeed = signal(false);
  protected readonly feedError = signal('');
  protected readonly publishing = signal(false);
  protected readonly publishError = signal('');
  protected readonly publishSuccess = signal('');
  protected readonly feedPage = signal(-1);
  protected readonly hasNext = signal(false);
  protected readonly strategy = signal('');
  protected readonly composer = viewChild<ElementRef<HTMLTextAreaElement>>('postInput');
  protected draft = '';

  protected loadFeed(reset = true): void {
    if (!reset && (this.loadingFeed() || !this.hasNext())) return;
    this.feedRequest?.unsubscribe();
    const page = reset ? 0 : this.feedPage() + 1;
    this.failedFeedPage = page;
    this.loadingFeed.set(true);
    this.feedError.set('');
    this.feedRequest = this.feeds
      .getFeed(page, reset ? undefined : this.strategy())
      .pipe(finalize(() => this.loadingFeed.set(false)))
      .subscribe({
        next: (feed) => {
          if (reset) {
            this.posts.set(feed.content);
          } else {
            const existing = new Set(this.posts().map((post) => post.postId));
            this.posts.update((posts) => [
              ...posts,
              ...feed.content.filter((post) => !existing.has(post.postId)),
            ]);
          }
          this.feedPage.set(feed.page);
          this.hasNext.set(feed.hasNext);
          this.strategy.set(feed.strategy);
        },
        error: (error: HttpErrorResponse) =>
          this.feedError.set(
            error.status === 401
              ? 'Sua sessão expirou. Entre novamente para carregar as publicações.'
              : 'Não foi possível carregar as publicações. Tente novamente.',
          ),
      });
  }

  protected retryFeed(): void {
    this.loadFeed(this.failedFeedPage === 0);
  }

  protected publish(): void {
    const content = this.draft.trim();
    if (!content || this.publishing()) return;
    this.publishing.set(true);
    this.publishError.set('');
    this.publishSuccess.set('');
    this.postRequest = this.publications
      .createPost(content)
      .pipe(finalize(() => this.publishing.set(false)))
      .subscribe({
        next: () => {
          this.draft = '';
          this.publishSuccess.set('Publicação enviada!');
          this.loadFeed();
        },
        error: (error: HttpErrorResponse) =>
          this.publishError.set(
            error.status === 400
              ? error.error?.message || 'Confira o conteúdo da publicação.'
              : error.status === 401
                ? 'Sua sessão expirou. Entre novamente para publicar.'
                : 'Não foi possível publicar. Seu texto foi mantido para você tentar novamente.',
          ),
      });
  }

  protected focusComposer(): void {
    this.composer()?.nativeElement.focus();
  }

  ngOnInit(): void {
    this.loadFeed();
    const userId = this.auth.currentUser()?.userId;
    if (!userId) {
      return;
    }

    this.photoRequest = this.http
      .get<ApiResponse<UserPhotoUrls>>(`/api/users/${encodeURIComponent(userId)}/photos`, {
        withCredentials: true,
      })
      .pipe(
        switchMap((response) =>
          response.data.profileUrl
            ? this.http.get(`/api/users/${encodeURIComponent(userId)}/photo`, {
                params: { url: response.data.profileUrl },
                responseType: 'blob',
                withCredentials: true,
              })
            : of(null),
        ),
      )
      .subscribe({
        next: (photo) => {
          if (photo) {
            this.profilePhoto.set(URL.createObjectURL(photo));
          }
        },
        error: () => this.showToast('Não foi possível carregar sua foto de perfil.'),
      });
  }

  protected clearPhoto(): void {
    if (this.profilePhoto()) {
      URL.revokeObjectURL(this.profilePhoto());
      this.profilePhoto.set('');
    }
  }

  ngOnDestroy(): void {
    this.feedRequest?.unsubscribe();
    this.postRequest?.unsubscribe();
    this.photoRequest?.unsubscribe();
    this.clearPhoto();
  }

  protected get initials(): string {
    const name = this.auth.currentUser()?.name ?? '';

    return name
      .trim()
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part.charAt(0).toLocaleUpperCase('pt-BR'))
      .join('');
  }

  protected showToast(message: string): void {
    this.toastMessage.set(message);
    globalThis.setTimeout(() => this.toastMessage.set(''), 2200);
  }
}
