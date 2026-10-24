import { HttpClient } from '@angular/common/http';
import { Component, inject, OnDestroy, OnInit, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { of, Subscription, switchMap } from 'rxjs';
import { ApiResponse } from '../../components/dto/api/api-response';
import { UserPhotoUrls } from '../../components/dto/auth/user-photo-urls';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-home-page',
  imports: [RouterLink],
  templateUrl: './home.page.html',
  styleUrl: './home.page.scss',
})
export class HomePage implements OnInit, OnDestroy {
  private readonly http = inject(HttpClient);
  private photoRequest?: Subscription;
  protected readonly profilePhoto = signal('');
  protected readonly auth = inject(AuthService);
  protected readonly toastMessage = signal('');

  ngOnInit(): void {
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
