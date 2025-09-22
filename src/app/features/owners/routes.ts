import { Routes } from '@angular/router';
import { authGuard, ownerGuard } from '@core/auth';
import { PetsPage } from '@features/owners/pages';

export const OWNERS_ROUTES: Routes = [
  { path: 'pets', component: PetsPage },
  {
    path: 'favorites',
    canActivate: [authGuard, ownerGuard],
    loadComponent: () => import('@features/owners/pages/favorites.page').then(m => m.FavoritesPage),
  },
  {
    path: 'profile/:id',
    canActivate: [authGuard],
    loadComponent: () => import('@features/owners/pages/owner-profile.page').then(m => m.OwnerProfilePage),
  },
];
