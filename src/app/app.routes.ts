import { Routes } from '@angular/router';
import { authGuard, guestGuard } from '../utils/auth.guards';

export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'feed' },
  {
    path: 'auth',
    canActivate: [guestGuard],
    loadComponent: () => import('../pages/auth/auth.page').then((page) => page.AuthPage),
  },
  {
    path: 'feed',
    canActivate: [authGuard],
    loadComponent: () => import('../pages/home/home.page').then((page) => page.HomePage),
  },
  { path: '**', redirectTo: '' },
];
