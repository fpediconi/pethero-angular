import { Routes } from '@angular/router';
import { PetsPage } from './pets/pets.page';
import { authGuard } from '../auth/auth.guard';

export const OWNERS_ROUTES: Routes = [
  { path: 'pets', component: PetsPage },
  { path: 'profile/:id', canActivate: [authGuard], loadComponent: () => import('./profile/owner-profile.page').then(m => m.OwnerProfilePage) }
];
