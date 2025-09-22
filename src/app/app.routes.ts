import { Routes } from '@angular/router';
import { authGuard, guardianGuard } from '@core/auth';

export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'home' },
  { path: 'auth', loadChildren: () => import('@features/auth/routes').then((m) => m.AUTH_ROUTES) },
  { path: 'guardians', canActivate: [authGuard], loadChildren: () => import('@features/guardians/routes').then((m) => m.GUARDIANS_ROUTES) },
  { path: 'owners', canActivate: [authGuard], loadChildren: () => import('@features/owners/routes').then((m) => m.OWNERS_ROUTES) },
  { path: 'bookings', canActivate: [authGuard], loadChildren: () => import('@features/bookings/routes').then((m) => m.BOOKINGS_ROUTES) },
  { path: 'reviews', canActivate: [authGuard], loadChildren: () => import('@features/reviews/routes').then((m) => m.REVIEWS_ROUTES) },
  { path: 'payments', canActivate: [authGuard], loadChildren: () => import('./payments/routes').then((m) => m.PAYMENTS_ROUTES) },
  { path: 'voucher', canActivate: [authGuard], loadChildren: () => import('@features/vouchers/routes').then((m) => m.VOUCHERS_ROUTES) },
  {
    path: 'me',
    canActivate: [authGuard],
    children: [
      {
        path: 'profile',
        loadComponent: () =>
          import('@features/profile/profile-form/profile-form.component').then((m) => m.ProfileFormComponent),
      },
      { path: '', pathMatch: 'full', redirectTo: 'profile' },
    ],
  },
  { path: 'reservas', redirectTo: 'bookings' },
  { path: 'home', canActivate: [authGuard], loadComponent: () => import('@app/home/home.page').then((m) => m.HomePageComponent) },
  {
    path: 'guardian/availability',
    canActivate: [authGuard, guardianGuard],
    loadComponent: () =>
      import('@features/guardians/components/availability/availability-page.component').then(
        (m) => m.AvailabilityPageComponent,
      ),
  },
  { path: '**', redirectTo: '' },
];
