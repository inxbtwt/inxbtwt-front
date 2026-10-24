import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { map } from 'rxjs';
import { AuthService } from '../services/auth.service';

export const authGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);

  return auth
    .checkSession()
    .pipe(map((authenticated) => authenticated || router.createUrlTree(['/auth'])));
};

export const guestGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);

  return auth
    .checkSession()
    .pipe(map((authenticated) => (authenticated ? router.createUrlTree(['/feed']) : true)));
};
