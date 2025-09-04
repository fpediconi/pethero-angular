import { Routes } from '@angular/router';
import { authGuard } from './auth/auth.guard';

export const routes: Routes = [
  { path: '', redirectTo: 'guardians/search', pathMatch: 'full' },
  { path: 'auth', loadChildren: () => import('./auth/routes').then(m => m.AUTH_ROUTES) },
  { path: 'owners', canActivate: [authGuard], loadChildren: () => import('./owners/routes').then(m => m.OWNERS_ROUTES) },
  { path: 'guardians', loadChildren: () => import('./guardians/routes').then(m => m.GUARDIANS_ROUTES) },
  { path: 'bookings', canActivate: [authGuard], loadChildren: () => import('./bookings/routes').then(m => m.BOOKINGS_ROUTES) },
  { path: 'messages', canActivate: [authGuard], loadChildren: () => import('./messages/routes').then(m => m.MESSAGES_ROUTES) },
  { path: 'reviews', canActivate: [authGuard], loadChildren: () => import('./reviews/routes').then(m => m.REVIEWS_ROUTES) },
  { path: 'payments', canActivate: [authGuard], loadChildren: () => import('./payments/routes').then(m => m.PAYMENTS_ROUTES) },
  { path: '**', redirectTo: '' }
];