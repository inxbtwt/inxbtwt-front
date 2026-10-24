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

  protected email = '';
  protected password = '';
  protected readonly submitting = signal(false);
  protected readonly error = signal('');

  protected login(): void {
    if (this.submitting()) {
      return;
    }

    this.submitting.set(true);
    this.error.set('');

    this.auth
      .login(this.email, this.password)
      .pipe(finalize(() => this.submitting.set(false)))
      .subscribe({
        next: () => {
          this.password = '';
          void this.router.navigateByUrl('/home');
        },
        error: (response: HttpErrorResponse) => {
          this.error.set(
            response.status === 401
              ? 'E-mail ou senha inválidos.'
              : 'Não foi possível entrar. Verifique a conexão e tente novamente.',
          );
        },
      });
  }
}
