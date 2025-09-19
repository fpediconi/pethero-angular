import { Routes } from '@angular/router';
import { authGuard } from './auth/auth.guard';
import { guardianGuard } from './auth/guardian.guard';

export const routes: Routes = [
  // 1) Home: redirige al buscador de guardianes
  { path: '', pathMatch: 'full', redirectTo: 'home' },

  // 2) Módulos lazy
  { path: 'auth', loadChildren: () => import('./auth/routes').then(m => m.AUTH_ROUTES) },
  { path: 'guardians', canActivate: [authGuard], loadChildren: () => import('./guardians/routes').then(m => m.GUARDIANS_ROUTES) },

  // 3) Módulos protegidos
  { path: 'owners',    canActivate: [authGuard], loadChildren: () => import('./owners/routes').then(m => m.OWNERS_ROUTES) },
  { path: 'bookings',  canActivate: [authGuard], loadChildren: () => import('./bookings/routes').then(m => m.BOOKINGS_ROUTES) },
  { path: 'reviews',   canActivate: [authGuard], loadChildren: () => import('./reviews/routes').then(m => m.REVIEWS_ROUTES) },
  { path: 'payments',  canActivate: [authGuard], loadChildren: () => import('./payments/routes').then(m => m.PAYMENTS_ROUTES) },
  { path: 'voucher',   canActivate: [authGuard], loadChildren: () => import('./vouchers/routes').then(m => m.VOUCHERS_ROUTES) },

  // 4) Zona “Mi cuenta” 
  {
    path: 'me',
    canActivate: [authGuard],
    children: [
      {
        path: 'profile',
        loadComponent: () =>
          import('./features/profile/profile-form/profile-form.component')
            .then(m => m.ProfileFormComponent),
      },
      { path: '', pathMatch: 'full', redirectTo: 'profile' }
    ]
  },

  { path: 'reservas', redirectTo: 'bookings' },
  { path: 'home', canActivate: [authGuard], loadComponent: () => import('./home/home.page').then(m => m.HomePageComponent) },
  { path: 'guardian/availability', canActivate: [authGuard, guardianGuard], loadComponent: () => import('./features/guardian/availability/availability-page.component').then(m => m.AvailabilityPageComponent) },
  { path: '**', redirectTo: '' },
];



