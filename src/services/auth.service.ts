import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { inject, Injectable, signal } from '@angular/core';
import { catchError, forkJoin, map, Observable, of, switchMap, tap, throwError } from 'rxjs';
import { ApiResponse } from '../components/dto/api/api-response';
import { AuthUser } from '../components/dto/auth/auth-user';
import { CsrfToken } from '../components/dto/auth/csrf-token';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly user = signal<AuthUser | null>(null);
  private readonly sessionError = signal('');

  readonly currentUser = this.user.asReadonly();
  readonly error = this.sessionError.asReadonly();

  checkSession(): Observable<boolean> {
    this.sessionError.set('');

    return this.fetchUser().pipe(
      catchError((error: HttpErrorResponse) => {
        if (error.status !== 401) {
          return throwError(() => error);
        }

        return this.csrf().pipe(
          switchMap((csrf) =>
            this.http.post('/api/auth/refresh', null, {
              headers: { [csrf.headerName]: csrf.token },
              withCredentials: true,
            }),
          ),
          switchMap(() => this.fetchUser()),
        );
      }),
      map(() => true),
      catchError((error: HttpErrorResponse) => {
        this.user.set(null);

        if (error.status !== 401) {
          this.sessionError.set('Não foi possível verificar sua sessão. Tente novamente.');
        }

        return of(false);
      }),
    );
  }

  login(email: string, password: string): Observable<AuthUser> {
    this.sessionError.set('');

    return this.csrf().pipe(
      switchMap((csrf) =>
        this.http.post(
          '/api/auth',
          { email, password },
          {
            headers: { [csrf.headerName]: csrf.token },
            withCredentials: true,
          },
        ),
      ),
      switchMap(() => this.fetchUser()),
    );
  }

  register(
    name: string,
    username: string,
    email: string,
    phone: string,
    password: string,
  ): Observable<AuthUser> {
    this.sessionError.set('');

    return this.csrf().pipe(
      switchMap((csrf) =>
        this.http.post(
          '/api/users',
          { name, username, email, phone, password },
          {
            headers: { [csrf.headerName]: csrf.token },
            withCredentials: true,
          },
        ),
      ),
      switchMap(() => this.login(email, password)),
    );
  }

  logout(): Observable<void> {
    return this.csrf().pipe(
      switchMap((csrf) =>
        this.http.post('/api/auth/logout', null, {
          headers: { [csrf.headerName]: csrf.token },
          withCredentials: true,
        }),
      ),
      tap(() => this.user.set(null)),
      map(() => undefined),
    );
  }

  updateProfile(
    userId: string,
    profile: Pick<AuthUser, 'name' | 'username' | 'email' | 'phone'>,
  ): Observable<AuthUser> {
    return this.csrf().pipe(
      switchMap((csrf) =>
        this.http.patch<ApiResponse<AuthUser>>(`/api/users/${userId}`, profile, {
          headers: { [csrf.headerName]: csrf.token },
          withCredentials: true,
        }),
      ),
      map((response) => response.data),
      tap((user) => this.user.set(user)),
    );
  }

  checkUsername(username: string): Observable<boolean> {
    return this.checkAvailability('username', username);
  }

  checkAvailability(field: 'email' | 'phone' | 'username', value: string): Observable<boolean> {
    return this.http
      .get<ApiResponse<{ available: boolean }>>('/api/users/availability', {
        params: { field, value },
        withCredentials: true,
      })
      .pipe(map((response) => response.data.available));
  }

  suggestUsernames(username: string): Observable<string[]> {
    const base = username.trim();
    const suffixes = [
      '_1',
      '_2',
      '_3',
      '_oficial',
      '_real',
      `_${Math.floor(1000 + Math.random() * 9000)}`,
    ];
    const candidates = [
      ...new Set(suffixes.map((suffix) => base.slice(0, 30 - suffix.length) + suffix)),
    ];

    return forkJoin(
      candidates.map((candidate) =>
        this.checkUsername(candidate).pipe(
          map((available) => (available ? candidate : null)),
          catchError(() => of(null)),
        ),
      ),
    ).pipe(map((names) => names.filter((name): name is string => name !== null).slice(0, 3)));
  }

  uploadProfilePhoto(userId: string, photo: File): Observable<{ url: string }> {
    const body = new FormData();
    body.append('photo', photo);

    return this.csrf().pipe(
      switchMap((csrf) =>
        this.http.post<ApiResponse<{ url: string }>>(
          `/api/users/${encodeURIComponent(userId)}/photo`,
          body,
          {
            params: { type: 'PROFILE' },
            headers: { [csrf.headerName]: csrf.token },
            withCredentials: true,
          },
        ),
      ),
      map((response) => response.data),
    );
  }

  private csrf(): Observable<CsrfToken> {
    return this.http
      .get<ApiResponse<CsrfToken>>('/api/auth/csrf', {
        withCredentials: true,
      })
      .pipe(map((response) => response.data));
  }

  private fetchUser(): Observable<AuthUser> {
    return this.http
      .get<ApiResponse<AuthUser>>('/api/me', {
        withCredentials: true,
      })
      .pipe(
        map((response) => response.data),
        tap((user) => this.user.set(user)),
      );
  }
}
