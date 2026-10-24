import { HttpErrorResponse } from '@angular/common/http';
import {
  Component,
  computed,
  DestroyRef,
  ElementRef,
  inject,
  OnInit,
  signal,
  viewChild,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { catchError, combineLatest, finalize, of, startWith, Subject, switchMap } from 'rxjs';
import { ProfileView } from '../../components/dto/profile/profile-search';
import { ProfileImage } from '../../components/profile-image/profile-image';
import { ProfilePosts } from '../../components/profile-posts/profile-posts';
import { ProfileSearch } from '../../components/profile-search/profile-search';
import { AuthService } from '../../services/auth.service';
import { ProfileService } from '../../services/profile.service';

@Component({
  selector: 'app-profile-view-page',
  imports: [RouterLink, ProfileImage, ProfileSearch, ProfilePosts],
  templateUrl: './profile-view.page.html',
})
export class ProfileViewPage implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly profiles = inject(ProfileService);
  private readonly destroyRef = inject(DestroyRef);
  protected readonly auth = inject(AuthService);
  protected readonly profile = signal<ProfileView | null>(null);
  protected readonly loading = signal(true);
  protected readonly error = signal('');
  protected readonly retry = new Subject<void>();
  protected readonly photoDialog = viewChild<ElementRef<HTMLDialogElement>>('photoDialog');
  protected readonly viewingCover = signal(false);
  protected readonly imageUrl = computed(() =>
    this.viewingCover() ? this.profile()?.coverUrl : this.profile()?.photoUrl,
  );
  protected readonly imageTitle = computed(() =>
    this.viewingCover() ? 'Capa do perfil' : 'Foto de perfil',
  );
  protected readonly memberSince = computed(() => {
    const createdAt = this.profile()?.createdAt;
    if (!createdAt) return '';
    const date = new Date(createdAt);
    return Number.isNaN(date.getTime())
      ? ''
      : new Intl.DateTimeFormat('pt-BR', {
          month: 'long',
          year: 'numeric',
        }).format(date);
  });

  ngOnInit(): void {
    combineLatest([this.route.paramMap, this.retry.pipe(startWith(undefined))])
      .pipe(
        switchMap(([params]) => {
          const username = params.get('username') ?? '';
          this.photoDialog()?.nativeElement.close();
          this.profile.set(null);
          this.error.set('');
          this.loading.set(true);
          if (username.toLowerCase() === this.auth.currentUser()?.username.toLowerCase()) {
            void this.router.navigateByUrl('/profile', { replaceUrl: true });
            return of(null);
          }
          return this.profiles.getByUsername(username).pipe(
            catchError((error: HttpErrorResponse) => {
              this.error.set(
                error.status === 404
                  ? 'Esse perfil não foi encontrado.'
                  : 'Não foi possível carregar o perfil. Tente novamente.',
              );
              return of(null);
            }),
            finalize(() => this.loading.set(false)),
          );
        }),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((profile) => this.profile.set(profile));
  }

  protected openPhoto(cover = false): void {
    this.viewingCover.set(cover);
    this.photoDialog()?.nativeElement.showModal();
  }

  protected closePhoto(): void {
    this.photoDialog()?.nativeElement.close();
  }

  protected closeBackdrop(event: MouseEvent): void {
    if (event.target === event.currentTarget) this.closePhoto();
  }
}
