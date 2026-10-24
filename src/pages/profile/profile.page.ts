import { NotificationBell } from '../../components/notification-bell/notification-bell';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import {
  Component,
  computed,
  ElementRef,
  inject,
  OnDestroy,
  OnInit,
  signal,
  viewChild,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { catchError, finalize, map, of, switchMap, Subscription, tap } from 'rxjs';
import { ApiResponse } from '../../components/dto/api/api-response';
import { UserProfile } from '../../components/dto/auth/user-profile';
import { UserPhotoUrls } from '../../components/dto/auth/user-photo-urls';
import { ProfilePosts } from '../../components/profile-posts/profile-posts';
import { ProfileSearch } from '../../components/profile-search/profile-search';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-profile-page',
  imports: [NotificationBell, FormsModule, RouterLink, ProfileSearch, ProfilePosts],
  templateUrl: './profile.page.html',
})
export class ProfilePage implements OnInit, OnDestroy {
  private photoRequests = new Subscription();
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);

  protected readonly auth = inject(AuthService);
  protected readonly profilePhoto = signal('');
  protected readonly coverPhoto = signal('');
  protected readonly profileDetails = signal<UserProfile | null>(null);
  protected readonly loadingProfile = signal(false);
  protected readonly profileLoadError = signal('');
  protected readonly coverFailed = signal(false);
  protected bio = '';
  private profileRequest?: Subscription;

  protected loadProfileDetails(): void {
    this.profileRequest?.unsubscribe();
    this.loadingProfile.set(true);
    this.profileLoadError.set('');
    this.profileRequest = this.auth
      .getUserProfile()
      .pipe(finalize(() => this.loadingProfile.set(false)))
      .subscribe({
        next: (profile) => this.applyProfileDetails(profile),
        error: () =>
          this.profileLoadError.set('Não foi possível carregar a bio e a capa. Tente novamente.'),
      });
  }

  private applyProfileDetails(profile: UserProfile): void {
    this.profileDetails.set(profile);
  }
  protected readonly photoDialog = viewChild<ElementRef<HTMLDialogElement>>('photoDialog');
  protected readonly photoPreview = signal('');
  protected readonly photoType = signal<'PROFILE' | 'COVER'>('PROFILE');
  protected readonly photoTitle = computed(() =>
    this.photoType() === 'COVER' ? 'Capa do perfil' : 'Foto de perfil',
  );
  protected readonly viewerImage = computed(
    () =>
      this.photoPreview() ||
      (this.photoType() === 'COVER' ? this.coverPhoto() : this.profilePhoto()),
  );
  protected readonly uploadingPhoto = signal(false);
  protected readonly photoFeedback = signal('');
  private viewerPhoto: File | null = null;
  private photoUpload?: Subscription;

  protected openPhoto(type: 'PROFILE' | 'COVER' = 'PROFILE'): void {
    if (this.uploadingPhoto() || this.saving()) {
      return;
    }
    this.photoType.set(type);
    this.resetPhotoPreview();
    this.photoFeedback.set('');
    this.photoDialog()?.nativeElement.showModal();
  }

  protected closePhotoOnBackdrop(event: MouseEvent): void {
    if (event.target === event.currentTarget) {
      this.closePhoto();
    }
  }

  protected closePhoto(event?: Event): void {
    if (this.uploadingPhoto()) {
      event?.preventDefault();
      return;
    }
    this.photoDialog()?.nativeElement.close();
    this.resetPhotoPreview();
  }

  protected selectViewerPhoto(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (!file) {
      return;
    }
    this.photoFeedback.set('');
    if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type)) {
      this.photoFeedback.set('Selecione uma imagem PNG, JPEG ou WebP.');
      return;
    }
    this.resetPhotoPreview();
    this.viewerPhoto = file;
    this.photoPreview.set(URL.createObjectURL(file));
  }

  protected resetPhotoPreview(): void {
    if (this.photoPreview()) {
      URL.revokeObjectURL(this.photoPreview());
    }
    this.photoPreview.set('');
    this.viewerPhoto = null;
  }

  protected savePhoto(): void {
    const userId = this.currentUser()?.userId;
    const file = this.viewerPhoto;
    if (!userId || !file || this.uploadingPhoto() || this.saving()) {
      return;
    }
    this.uploadingPhoto.set(true);
    this.photoFeedback.set('');
    const type = this.photoType();
    this.photoUpload = this.auth
      .uploadUserPhoto(userId, file, type)
      .pipe(finalize(() => this.uploadingPhoto.set(false)))
      .subscribe({
        next: (uploaded) => {
          const target = type === 'COVER' ? this.coverPhoto : this.profilePhoto;
          this.replacePhoto(target, URL.createObjectURL(file));
          if (type === 'COVER') {
            this.coverFailed.set(false);
            this.profileDetails.update((profile) =>
              profile ? { ...profile, coverUrl: uploaded.url } : profile,
            );
          }
          this.resetPhotoPreview();
          this.photoFeedback.set(
            type === 'COVER' ? 'Capa atualizada.' : 'Foto de perfil atualizada.',
          );
        },
        error: (error: HttpErrorResponse) =>
          this.photoFeedback.set(
            error.status === 400 || error.status === 413
              ? error.error?.message || 'Confira o formato e o tamanho da imagem.'
              : 'Não foi possível salvar a imagem. Tente novamente.',
          ),
      });
  }

  protected readonly editing = signal(false);
  protected readonly saving = signal(false);
  protected readonly loggingOut = signal(false);
  protected readonly feedback = signal('');
  protected readonly currentUser = this.auth.currentUser;
  protected readonly memberSince = computed(() => {
    const createdAt = this.currentUser()?.createdAt;

    if (!createdAt) {
      return '';
    }

    const date = new Date(createdAt);

    if (Number.isNaN(date.getTime())) {
      return '';
    }

    return new Intl.DateTimeFormat('pt-BR', {
      month: 'long',
      year: 'numeric',
    }).format(date);
  });

  protected name = '';
  protected username = '';
  protected photo: File | null = null;
  protected readonly usernameFeedback = signal('');
  protected readonly usernameValid = signal(false);
  protected readonly usernameSuggestions = signal<string[]>([]);
  private usernameCheck?: Subscription;
  private suggestionCheck?: Subscription;

  protected usernameChanged(username: string): void {
    this.username = username;
    this.usernameValid.set(false);
    this.usernameFeedback.set('');
    this.usernameSuggestions.set([]);
    this.usernameCheck?.unsubscribe();
    this.suggestionCheck?.unsubscribe();
  }

  protected chooseUsername(username: string): void {
    this.usernameChanged(username);
    this.checkUsername();
  }
  protected email = '';
  protected phone = '';

  private readonly route = inject(ActivatedRoute);

  ngOnInit(): void {
    if (this.route.snapshot.queryParamMap.get('photoUploadFailed') === 'true') {
      this.feedback.set(
        'Conta criada, mas a foto não foi enviada. Edite seu perfil para tentar novamente.',
      );
    }
    this.loadPhotos();
    this.loadProfileDetails();
  }

  private loadPhotos(): void {
    const userId = this.currentUser()?.userId;

    if (!userId) {
      return;
    }

    this.photoRequests.unsubscribe();
    this.photoRequests = new Subscription();
    this.photoRequests.add(
      this.http
        .get<ApiResponse<UserPhotoUrls>>(`/api/users/${encodeURIComponent(userId)}/photos`, {
          withCredentials: true,
        })
        .pipe(map((response) => response.data))
        .subscribe({
          next: (photos) => {
            this.loadPhoto(userId, photos.profileUrl, this.profilePhoto);
            this.loadPhoto(userId, photos.coverUrl, this.coverPhoto);
          },
          error: () =>
            this.feedback.set('Não foi possível carregar as fotos do perfil. Tente novamente.'),
        }),
    );
  }

  private loadPhoto(
    userId: string,
    photoUrl: string | null,
    target: typeof this.profilePhoto,
  ): void {
    if (!photoUrl) {
      this.replacePhoto(target, '');
      return;
    }

    this.photoRequests.add(
      this.http
        .get(`/api/users/${encodeURIComponent(userId)}/photo`, {
          params: { url: photoUrl },
          responseType: 'blob',
          withCredentials: true,
        })
        .subscribe({
          next: (photo) => {
            this.replacePhoto(target, URL.createObjectURL(photo));
            if (target === this.coverPhoto) {
              this.coverFailed.set(false);
            }
          },
          error: () =>
            this.feedback.set('Não foi possível carregar a imagem do perfil. Tente novamente.'),
        }),
    );
  }

  private replacePhoto(target: typeof this.profilePhoto, url: string): void {
    if (target().startsWith('blob:')) {
      URL.revokeObjectURL(target());
    }
    target.set(url);
  }

  ngOnDestroy(): void {
    this.profileRequest?.unsubscribe();
    this.photoUpload?.unsubscribe();
    this.resetPhotoPreview();
    this.photoRequests.unsubscribe();
    this.usernameCheck?.unsubscribe();
    this.suggestionCheck?.unsubscribe();
    this.replacePhoto(this.profilePhoto, '');
    this.replacePhoto(this.coverPhoto, '');
  }

  protected checkUsername(): void {
    const username = this.username.trim();
    this.usernameChanged(this.username);
    if (username.length < 3 || username.length > 30) {
      this.usernameFeedback.set('Use entre 3 e 30 caracteres.');
      return;
    }
    if (username.toLowerCase() === this.currentUser()?.username?.toLowerCase()) {
      this.usernameValid.set(true);
      return;
    }
    this.usernameCheck = this.auth.checkUsername(username).subscribe({
      next: (available) => {
        if (this.username.trim() === username) {
          this.usernameValid.set(available);
          this.usernameFeedback.set(available ? '' : 'Este username já está em uso.');
          if (!available) {
            this.suggestionCheck = this.auth
              .suggestUsernames(username)
              .subscribe((suggestions) => this.usernameSuggestions.set(suggestions));
          }
        }
      },
      error: () => {
        if (this.username.trim() === username) {
          this.usernameFeedback.set('Não foi possível consultar o username. Tente novamente.');
        }
      },
    });
  }

  protected selectPhoto(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.photo = input.files?.[0] ?? null;
    if (this.photo && !['image/png', 'image/jpeg', 'image/webp'].includes(this.photo.type)) {
      this.photo = null;
      input.value = '';
      this.feedback.set('Selecione uma imagem PNG, JPEG ou WebP.');
    }
  }

  protected getInitials(): string {
    return (this.currentUser()?.name ?? '')
      .trim()
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part.charAt(0).toLocaleUpperCase('pt-BR'))
      .join('');
  }

  protected startEditing(): void {
    const user = this.currentUser();

    if (!user || !this.profileDetails()) {
      return;
    }

    this.name = user.name;
    this.usernameChanged(user.username ?? '');
    this.usernameValid.set(Boolean(user.username));
    this.photo = null;
    this.usernameFeedback.set('');
    this.email = user.email;
    this.phone = user.phone;
    this.bio = this.profileDetails()?.bio ?? '';
    this.feedback.set('');
    this.editing.set(true);
  }

  protected cancelEditing(): void {
    if (this.saving()) {
      return;
    }

    this.editing.set(false);
    this.feedback.set('');
  }

  protected saveProfile(): void {
    const userId = this.currentUser()?.userId;

    if (!userId || this.saving() || !this.profileDetails()) {
      return;
    }

    this.saving.set(true);
    this.feedback.set('');

    const user = this.currentUser()!;
    const account = {
      name: this.name.trim(),
      username: this.username.trim(),
      email: this.email.trim(),
      phone: this.phone.trim(),
    };
    const accountChanged =
      account.name !== user.name ||
      account.username !== user.username ||
      account.email !== user.email ||
      account.phone !== user.phone;
    const details = { bio: this.bio };
    const detailsChanged = details.bio !== (this.profileDetails()?.bio ?? '');

    const request = accountChanged ? this.auth.updateProfile(userId, account) : of(user);
    request
      .pipe(
        switchMap(() =>
          detailsChanged
            ? this.auth
                .updateUserProfile(details)
                .pipe(tap((profile) => this.applyProfileDetails(profile)))
            : of(this.profileDetails()),
        ),
        switchMap(() =>
          this.photo
            ? this.auth.uploadProfilePhoto(userId, this.photo).pipe(
                catchError(() => {
                  this.feedback.set('Dados salvos, mas a foto não foi enviada. Tente novamente.');
                  return of(null);
                }),
              )
            : of(null),
        ),
        finalize(() => this.saving.set(false)),
      )
      .subscribe({
        next: () => {
          this.loadPhotos();
          if (this.feedback()) {
            return;
          }
          this.editing.set(false);
          this.feedback.set('Perfil atualizado. O caos segue organizado.');
        },
        error: (error: HttpErrorResponse) => {
          this.feedback.set(
            error.status === 409 || error.status === 400
              ? error.error?.message || 'Confira os dados e tente novamente.'
              : 'Não foi possível atualizar seu perfil agora.',
          );
        },
      });
  }

  protected logout(): void {
    if (this.loggingOut()) {
      return;
    }

    this.loggingOut.set(true);
    this.feedback.set('');

    this.auth
      .logout()
      .pipe(finalize(() => this.loggingOut.set(false)))
      .subscribe({
        next: () => void this.router.navigateByUrl('/auth'),
        error: () => this.feedback.set('Não foi possível sair agora. Tente novamente.'),
      });
  }
}
