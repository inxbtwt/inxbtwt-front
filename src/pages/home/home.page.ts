import { Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-home-page',
  imports: [RouterLink],
  templateUrl: './home.page.html',
  styleUrl: './home.page.scss',
})
export class HomePage {
  protected readonly auth = inject(AuthService);
  protected readonly toastMessage = signal('');

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
