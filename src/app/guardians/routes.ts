import { Routes } from '@angular/router';
import { GuardianSearchPage } from './search/guardian-search.page';
import { GuardianProfilePage } from './profile/guardian-profile.page';
import { authGuard } from '../auth/auth.guard';

export const GUARDIANS_ROUTES: Routes = [
  { path: 'search', canActivate: [authGuard], component: GuardianSearchPage },
  { path: 'profile/:id', component: GuardianProfilePage }
];
