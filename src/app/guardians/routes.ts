import { Routes } from '@angular/router';
import { GuardianSearchPage } from './search/guardian-search.page';
import { GuardianProfilePage } from './profile/guardian-profile.page';

export const GUARDIANS_ROUTES: Routes = [
  { path: 'search', component: GuardianSearchPage },
  { path: 'profile/:id', component: GuardianProfilePage }
];