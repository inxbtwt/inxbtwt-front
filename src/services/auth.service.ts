import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { inject, Injectable, signal } from '@angular/core';
import { catchError, map, Observable, of, switchMap, tap, throwError } from 'rxjs';
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

  register(name: string, email: string, phone: string, password: string): Observable<AuthUser> {
    this.sessionError.set('');

    return this.csrf().pipe(
      switchMap((csrf) =>
        this.http.post(
          '/api/users',
          { name, email, phone, password },
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
    profile: Pick<AuthUser, 'name' | 'email' | 'phone'>,
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
