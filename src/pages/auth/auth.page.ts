import { HttpErrorResponse } from '@angular/common/http';
import { Component, inject, OnDestroy, signal } from '@angular/core';
import { FormsModule, NgForm } from '@angular/forms';
import { Router } from '@angular/router';
import { catchError, finalize, map, of, Subscription, switchMap, timer } from 'rxjs';
import { AuthService } from '../../services/auth.service';

type UniqueField = 'email' | 'phone' | 'username';
type Availability = 'idle' | 'checking' | 'available' | 'used' | 'error';

@Component({
  selector: 'app-auth-page',
  imports: [FormsModule],
  templateUrl: './auth.page.html',
  styleUrl: './auth.page.scss',
})
export class AuthPage implements OnDestroy {
  protected readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  protected readonly uniqueFields: UniqueField[] = ['email', 'phone', 'username'];

  protected retryAvailability(field: UniqueField): void {
    this.checkAvailability(field, this[field]);
  }

  protected readonly steps = ['Dados', 'Username', 'Foto', 'Revisão'];
  protected readonly step = signal(0);
  protected readonly advancing = signal(false);
  protected readonly availability = signal<Record<UniqueField, Availability>>({
    email: 'idle',
    phone: 'idle',
    username: 'idle',
  });
  private readonly checks: Partial<Record<UniqueField, Subscription>> = {};
  protected readonly usernameSuggestions = signal<string[]>([]);
  protected readonly suggestingUsernames = signal(false);
  private suggestionCheck?: Subscription;

  protected chooseUsername(username: string): void {
    this.checkAvailability('username', username);
  }

  private loadUsernameSuggestions(username: string): void {
    this.suggestingUsernames.set(true);
    this.suggestionCheck = this.auth
      .suggestUsernames(username)
      .pipe(finalize(() => this.suggestingUsernames.set(false)))
      .subscribe((suggestions) => this.usernameSuggestions.set(suggestions));
  }

  private readonly checkedValues: Partial<Record<UniqueField, string>> = {};

  protected checkAvailability(field: UniqueField, value: string): void {
    this[field] = value;
    if (field === 'username') {
      this.suggestionCheck?.unsubscribe();
      this.usernameSuggestions.set([]);
    }
    this.checks[field]?.unsubscribe();
    delete this.checkedValues[field];
    const normalized = value.trim();
    const valid =
      field === 'email'
        ? /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized)
        : field === 'phone'
          ? /[0-9]/.test(normalized)
          : normalized.length >= 3 && normalized.length <= 30;
    this.availability.update((state) => ({ ...state, [field]: valid ? 'checking' : 'idle' }));
    if (!valid) {
      return;
    }
    this.checks[field] = timer(400)
      .pipe(switchMap(() => this.auth.checkAvailability(field, normalized)))
      .subscribe({
        next: (available) => {
          this.checkedValues[field] = normalized;
          this.availability.update((state) => ({
            ...state,
            [field]: available ? 'available' : 'used',
          }));
          if (field === 'username' && !available) {
            this.loadUsernameSuggestions(normalized);
          }
        },
        error: () => this.availability.update((state) => ({ ...state, [field]: 'error' })),
      });
  }

  protected availabilityMessage(field: UniqueField): string {
    const label = { email: 'E-mail', phone: 'Telefone', username: 'Username' }[field];
    switch (this.availability()[field]) {
      case 'checking':
        return 'Verificando disponibilidade…';
      case 'used':
        return `${label} já está em uso.`;
      case 'available':
        return '';
      case 'error':
        return 'Não foi possível verificar. Tente novamente.';
      default:
        return '';
    }
  }

  protected availabilityBlocked(): boolean {
    if (!this.creatingAccount()) {
      return false;
    }
    const fields: UniqueField[] =
      this.step() === 0
        ? ['email', 'phone']
        : this.step() === 1
          ? ['username']
          : ['email', 'phone', 'username'];
    return fields.some(
      (field) =>
        this.availability()[field] !== 'available' ||
        this.checkedValues[field] !== this[field].trim(),
    );
  }
  protected readonly photoPreview = signal('');

  protected submitStep(form: NgForm): void {
    if (form.invalid || this.submitting() || this.advancing() || this.availabilityBlocked()) {
      return;
    }
    this.error.set('');
    if (!this.creatingAccount() || this.step() === 3) {
      this.login();
      return;
    }
    this.step.update((step) => step + 1);
  }

  protected previousStep(): void {
    if (!this.submitting() && !this.advancing()) {
      this.step.update((step) => Math.max(0, step - 1));
      this.error.set('');
    }
  }

  protected removePhoto(): void {
    if (this.photoPreview()) {
      URL.revokeObjectURL(this.photoPreview());
    }
    this.photoPreview.set('');
    this.photo = null;
  }

  ngOnDestroy(): void {
    this.removePhoto();
    this.suggestionCheck?.unsubscribe();
    Object.values(this.checks).forEach((check) => check.unsubscribe());
  }

  protected name = '';
  protected username = '';
  protected photo: File | null = null;
  protected phone = '';
  protected readonly creatingAccount = signal(false);
  protected readonly passwordVisible = signal(false);

  protected email = '';
  protected password = '';
  protected readonly submitting = signal(false);
  protected readonly error = signal('');

  protected selectPhoto(event: Event): void {
    this.removePhoto();
    this.error.set('');
    const input = event.target as HTMLInputElement;
    this.photo = input.files?.[0] ?? null;
    if (this.photo && !['image/png', 'image/jpeg', 'image/webp'].includes(this.photo.type)) {
      this.photo = null;
      input.value = '';
      this.error.set('Selecione uma imagem PNG, JPEG ou WebP.');
    }
    if (this.photo) {
      this.photoPreview.set(URL.createObjectURL(this.photo));
    }
  }

  protected toggleMode(): void {
    if (this.submitting() || this.advancing()) {
      return;
    }

    this.step.set(0);
    this.removePhoto();
    this.creatingAccount.update((value) => !value);
    if (this.creatingAccount()) {
      this.checkAvailability('email', this.email);
      this.checkAvailability('phone', this.phone);
      this.checkAvailability('username', this.username);
    }
    this.password = '';
    this.passwordVisible.set(false);
    this.error.set('');
  }

  protected login(): void {
    if (this.submitting() || this.advancing() || this.availabilityBlocked()) {
      return;
    }

    this.submitting.set(true);
    this.error.set('');

    const request = this.creatingAccount()
      ? this.auth.register(
          this.name.trim(),
          this.username.trim(),
          this.email.trim(),
          this.phone.trim(),
          this.password,
        )
      : this.auth.login(this.email.trim(), this.password);

    let photoUploadFailed = false;
    request
      .pipe(
        switchMap((user) =>
          this.creatingAccount() && this.photo
            ? this.auth.uploadProfilePhoto(user.userId, this.photo).pipe(
                map(() => user),
                catchError(() => {
                  photoUploadFailed = true;
                  return of(user);
                }),
              )
            : of(user),
        ),
        finalize(() => this.submitting.set(false)),
      )
      .subscribe({
        next: () => {
          this.password = '';
          if (photoUploadFailed) {
            void this.router.navigate(['/profile'], {
              queryParams: { photoUploadFailed: 'true' },
            });
            return;
          }
          void this.router.navigateByUrl(
            this.creatingAccount() && this.photo ? '/profile' : '/feed',
          );
        },
        error: (response: HttpErrorResponse) => {
          if (this.creatingAccount() && response.status === 409) {
            this.step.set(0);
            this.uniqueFields.forEach((field) => this.checkAvailability(field, this[field]));
          }
          this.error.set(
            response.status === 401
              ? 'E-mail ou senha inválidos.'
              : response.status === 400 || response.status === 409
                ? response.error?.message || 'Confira os dados e tente novamente.'
                : 'Não foi possível entrar. Verifique a conexão e tente novamente.',
          );
        },
      });
  }
}
