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
  {
    path: 'profile',
    canActivate: [authGuard],
    loadComponent: () => import('../pages/profile/profile.page').then((page) => page.ProfilePage),
  },
  {
    path: 'profile/:username',
    canActivate: [authGuard],
    loadComponent: () =>
      import('../pages/profile-view/profile-view.page').then((page) => page.ProfileViewPage),
  },
  {
    path: 'posts/:postId',
    canActivate: [authGuard],
    loadComponent: () => import('../pages/post/post.page').then((page) => page.PostPage),
  },
  {
    path: 'notifications',
    canActivate: [authGuard],
    loadComponent: () =>
      import('../pages/notifications/notifications.page').then((page) => page.NotificationsPage),
  },
  {
    path: 'friends',
    canActivate: [authGuard],
    loadComponent: () => import('../pages/friends/friends.page').then((page) => page.FriendsPage),
  },
  { path: '**', redirectTo: '' },
];
