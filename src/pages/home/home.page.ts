import { NotificationBell } from '../../components/notification-bell/notification-bell';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import {
  Component,
  afterNextRender,
  Injector,
  computed,
  DestroyRef,
  ElementRef,
  inject,
  OnDestroy,
  OnInit,
  signal,
  viewChild,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { finalize, of, Subscription, switchMap } from 'rxjs';
import { ApiResponse } from '../../components/dto/api/api-response';
import { UserPhotoUrls } from '../../components/dto/auth/user-photo-urls';
import { ProfileSearch } from '../../components/profile-search/profile-search';
import { TenorGif, parseTenorId } from '../../components/tenor-gif/tenor-gif';
import { PostCard } from '../../components/post-card/post-card';
import { Post } from '../../components/dto/post/post';
import { FeedService } from '../../services/feed.service';
import { PostService } from '../../services/post.service';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-home-page',
  imports: [NotificationBell, RouterLink, ProfileSearch, FormsModule, PostCard, TenorGif],
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
  private readonly injector = inject(Injector);
  protected readonly composerOpen = signal(false);
  protected readonly composerButton = viewChild<ElementRef<HTMLButtonElement>>('composerButton');
  protected readonly composer = viewChild<ElementRef<HTMLTextAreaElement>>('postInput');
  protected draft = '';
  protected readonly attachments = signal<{ file: File; url: string }[]>([]);
  protected readonly mediaError = signal('');
  protected readonly gifOptionsOpen = signal(false);
  protected readonly invertGifOptions = (open: boolean) => !open;
  protected readonly tenorInput = signal('');
  protected readonly tenorId = computed(() => parseTenorId(this.tenorInput()));

  protected selectMedia(event: Event): void {
    const input = event.target as HTMLInputElement;
    const files = Array.from(input.files ?? []);
    input.value = '';
    if (this.publishing() || !files.length) return;
    this.mediaError.set('');
    if (this.tenorInput().trim()) {
      this.mediaError.set('Remova o GIF do Tenor antes de selecionar arquivos locais.');
      return;
    }
    const combined = [...this.attachments().map((attachment) => attachment.file), ...files];
    if (combined.length > 4) {
      this.mediaError.set('Selecione até 4 imagens ou 1 GIF.');
      return;
    }
    if (combined.some((file) => !['image/png', 'image/jpeg', 'image/gif'].includes(file.type))) {
      this.mediaError.set('Selecione arquivos PNG, JPEG ou GIF.');
      return;
    }
    if (combined.some((file) => !file.size || file.size > 10 * 1024 * 1024)) {
      this.mediaError.set('Cada arquivo deve ter conteúdo e no máximo 10 MB.');
      return;
    }
    if (combined.some((file) => file.type === 'image/gif') && combined.length > 1) {
      this.mediaError.set('Selecione apenas um GIF, sem outras imagens.');
      return;
    }
    this.attachments.update((current) => [
      ...current,
      ...files.map((file) => ({ file, url: URL.createObjectURL(file) })),
    ]);
    this.publishError.set('');
    this.publishSuccess.set('');
  }

  protected removeMedia(index: number): void {
    if (this.publishing()) return;
    URL.revokeObjectURL(this.attachments()[index].url);
    this.attachments.update((current) => current.filter((_, position) => position !== index));
    this.mediaError.set('');
  }

  private clearMedia(): void {
    for (const attachment of this.attachments()) URL.revokeObjectURL(attachment.url);
    this.attachments.set([]);
    this.tenorInput.set('');
    this.gifOptionsOpen.set(false);
  }

  constructor() {
    this.publications.removals
      .pipe(takeUntilDestroyed(inject(DestroyRef)))
      .subscribe(({ postId }) => {
        this.posts.update((posts) => posts.filter((post) => post.postId !== postId));
      });
  }

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
    if ((!content && !this.attachments().length && !this.tenorId()) || this.publishing()) return;
    if (this.tenorInput().trim() && !this.tenorId()) return;
    this.publishing.set(true);
    this.publishError.set('');
    this.publishSuccess.set('');
    this.postRequest = this.publications
      .createPost(
        content,
        this.attachments().map((attachment) => attachment.file),
        this.tenorInput(),
      )
      .pipe(finalize(() => this.publishing.set(false)))
      .subscribe({
        next: () => {
          this.draft = '';
          this.clearMedia();
          this.publishSuccess.set('Publicação enviada!');
          this.hideComposer();
          this.loadFeed();
        },
        error: (error: HttpErrorResponse) =>
          this.publishError.set(
            error.status === 413
              ? 'Cada arquivo deve ter no máximo 10 MB.'
              : error.status === 400
                ? error.error?.message || 'Confira o conteúdo da publicação.'
                : error.status === 401
                  ? 'Sua sessão expirou. Entre novamente para publicar.'
                  : 'Não foi possível publicar. Seu texto e anexos foram mantidos para você tentar novamente.',
          ),
      });
  }

  protected focusComposer(): void {
    this.composerOpen.set(true);
    afterNextRender(() => this.composer()?.nativeElement.focus(), { injector: this.injector });
  }

  protected closeComposer(): void {
    if (this.publishing()) return;
    this.hideComposer();
  }

  private hideComposer(): void {
    this.composerOpen.set(false);
    afterNextRender(() => this.composerButton()?.nativeElement.focus(), {
      injector: this.injector,
    });
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
    this.clearMedia();
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
