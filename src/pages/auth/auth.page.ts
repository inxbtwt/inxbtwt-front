import { HttpErrorResponse } from '@angular/common/http';
import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { finalize } from 'rxjs';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-auth-page',
  imports: [FormsModule],
  templateUrl: './auth.page.html',
  styleUrl: './auth.page.scss',
})
export class AuthPage {
  protected readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  protected name = '';
  protected phone = '';
  protected readonly creatingAccount = signal(false);
  protected readonly passwordVisible = signal(false);

  protected email = '';
  protected password = '';
  protected readonly submitting = signal(false);
  protected readonly error = signal('');

  protected toggleMode(): void {
    if (this.submitting()) {
      return;
    }

    this.creatingAccount.update((value) => !value);
    this.password = '';
    this.passwordVisible.set(false);
    this.error.set('');
  }

  protected login(): void {
    if (this.submitting()) {
      return;
    }

    this.submitting.set(true);
    this.error.set('');

    const request = this.creatingAccount()
      ? this.auth.register(this.name.trim(), this.email.trim(), this.phone.trim(), this.password)
      : this.auth.login(this.email.trim(), this.password);

    request.pipe(finalize(() => this.submitting.set(false))).subscribe({
      next: () => {
        this.password = '';
        void this.router.navigateByUrl('/feed');
      },
      error: (response: HttpErrorResponse) => {
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
