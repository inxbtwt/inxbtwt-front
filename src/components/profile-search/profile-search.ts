import { Component, DestroyRef, ElementRef, HostListener, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { catchError, map, of, Subject, switchMap, timer } from 'rxjs';
import { ProfileSummary } from '../dto/profile/profile-search';
import { AuthService } from '../../services/auth.service';
import { ProfileService } from '../../services/profile.service';
import { ProfileImage } from '../profile-image/profile-image';

@Component({
  selector: 'app-profile-search',
  imports: [RouterLink, ProfileImage],
  templateUrl: './profile-search.html',
  styleUrl: './profile-search.scss',
})
export class ProfileSearch {
  private readonly profiles = inject(ProfileService);
  private readonly auth = inject(AuthService);
  private readonly element = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly requests = new Subject<{ query: string; page: number; delay: number }>();
  protected readonly query = signal('');
  protected readonly open = signal(false);
  protected readonly loading = signal(false);
  protected readonly error = signal('');
  protected readonly results = signal<ProfileSummary[]>([]);
  protected readonly page = signal(0);
  protected readonly totalPages = signal(0);

  constructor() {
    this.requests
      .pipe(
        switchMap(({ query, page, delay }) =>
          !query
            ? of(null)
            : timer(delay).pipe(
                switchMap(() => this.profiles.search(query, page)),
                map((response) => ({ response, error: '' })),
                catchError(() =>
                  of({ response: null, error: 'Não foi possível pesquisar. Tente novamente.' }),
                ),
              ),
        ),
        takeUntilDestroyed(inject(DestroyRef)),
      )
      .subscribe((result) => {
        this.loading.set(false);
        this.error.set(result?.error ?? '');
        if (result?.response) {
          this.results.set(
            result.response.content.filter(
              (profile) => profile.userId !== this.auth.currentUser()?.userId,
            ),
          );
          this.page.set(result.response.number);
          this.totalPages.set(result.response.totalPages);
        }
      });
  }

  protected input(value: string): void {
    this.query.set(value);
    this.search(0, 300);
  }

  protected search(page = 0, delay = 0): void {
    const query = this.query().trim();
    this.results.set([]);
    this.totalPages.set(0);
    this.error.set('');
    this.open.set(Boolean(query));
    this.loading.set(Boolean(query));
    this.requests.next({ query, page, delay });
  }

  protected close(): void {
    this.open.set(false);
  }

  protected keydown(event: KeyboardEvent): void {
    if (event.key === 'Escape') {
      this.close();
      return;
    }
    if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp') return;
    const links = [
      ...this.element.nativeElement.querySelectorAll<HTMLAnchorElement>('[data-profile-result]'),
    ];
    if (!links.length) return;
    event.preventDefault();
    const index = links.indexOf(document.activeElement as HTMLAnchorElement);
    const next =
      event.key === 'ArrowDown'
        ? (index + 1) % links.length
        : (index <= 0 ? links.length : index) - 1;
    links[next].focus();
  }

  @HostListener('document:click', ['$event'])
  protected outsideClick(event: MouseEvent): void {
    if (!this.element.nativeElement.contains(event.target as Node)) this.close();
  }

  protected select(): void {
    this.close();
    this.query.set('');
    this.requests.next({ query: '', page: 0, delay: 0 });
  }
}
