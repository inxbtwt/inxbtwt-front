import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { catchError, finalize, map, of } from 'rxjs';
import { ApiResponse } from '../../components/dto/api/api-response';
import { UserPhotoUrls } from '../../components/dto/auth/user-photo-urls';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-profile-page',
  imports: [FormsModule, RouterLink],
  templateUrl: './profile.page.html',
  styleUrl: './profile.page.scss',
})
export class ProfilePage implements OnInit {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);

  protected readonly auth = inject(AuthService);
  protected readonly profilePhoto = signal('');
  protected readonly coverPhoto = signal('');
  protected readonly editing = signal(false);
  protected readonly saving = signal(false);
  protected readonly loggingOut = signal(false);
  protected readonly feedback = signal('');
  protected readonly selectedTab = signal('Publicações');
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

  protected readonly tabs = ['Publicações', 'Respostas', 'Mídia', 'Curtidas'];
  protected name = '';
  protected email = '';
  protected phone = '';

  ngOnInit(): void {
    const userId = this.currentUser()?.userId;

    if (!userId) {
      return;
    }

    this.http
      .get<ApiResponse<UserPhotoUrls>>(`/api/users/${userId}/photos`, {
        withCredentials: true,
      })
      .pipe(
        map((response) => response.data),
        catchError(() => of(null)),
      )
      .subscribe((photos) => {
        if (!photos) {
          return;
        }

        this.profilePhoto.set(this.photoEndpoint(userId, photos.profileUrl));
        this.coverPhoto.set(this.photoEndpoint(userId, photos.coverUrl));
      });
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

    if (!user) {
      return;
    }

    this.name = user.name;
    this.email = user.email;
    this.phone = user.phone;
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

    if (!userId || this.saving()) {
      return;
    }

    this.saving.set(true);
    this.feedback.set('');

    this.auth
      .updateProfile(userId, {
        name: this.name.trim(),
        email: this.email.trim(),
        phone: this.phone.trim(),
      })
      .pipe(finalize(() => this.saving.set(false)))
      .subscribe({
        next: () => {
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

  protected selectTab(tab: string): void {
    this.selectedTab.set(tab);
  }

  private photoEndpoint(userId: string, photoUrl: string | null): string {
    if (!photoUrl) {
      return '';
    }

    return `/api/users/${encodeURIComponent(userId)}/photo?url=${encodeURIComponent(photoUrl)}`;
  }
}
