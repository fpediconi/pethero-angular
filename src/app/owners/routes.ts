import { Routes } from '@angular/router';
import { PetsPage } from './pets/pets.page';
import { authGuard } from '../auth/auth.guard';
import { ownerGuard } from '../auth/owner.guard';

export const OWNERS_ROUTES: Routes = [
  { path: 'pets', component: PetsPage },
  { path: 'favorites', canActivate: [authGuard, ownerGuard], loadComponent: () => import('./favorites/favorites.page').then(m => m.FavoritesPage) },
  { path: 'profile/:id', canActivate: [authGuard], loadComponent: () => import('./profile/owner-profile.page').then(m => m.OwnerProfilePage) }
];
