import { Routes } from '@angular/router';
import { authGuard } from '@core/auth';
import { GuardianProfilePage, GuardianSearchPage } from '@features/guardians/pages';

export const GUARDIANS_ROUTES: Routes = [
  { path: 'search', canActivate: [authGuard], component: GuardianSearchPage },
  { path: 'profile/:id', component: GuardianProfilePage }
];
