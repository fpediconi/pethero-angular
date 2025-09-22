import { Routes } from '@angular/router';

export const AUTH_ROUTES: Routes = [
  {
    path: 'login',
    loadComponent: () =>
      import('@features/auth/pages/login/login.component').then((m) => m.LoginComponent),
  },
  {
    path: 'register',
    loadComponent: () =>
      import('@features/auth/pages/register/register.component').then((m) => m.RegisterComponent),
  },
  {
    path: 'register-owner',
    loadComponent: () =>
      import('@features/auth/pages/register/register.component').then((m) => m.RegisterComponent),
    data: { role: 'owner' as const },
  },
  {
    path: 'register-guardian',
    loadComponent: () =>
      import('@features/auth/pages/register/register.component').then((m) => m.RegisterComponent),
    data: { role: 'guardian' as const },
  },
  { path: '', pathMatch: 'full', redirectTo: 'login' },
];
