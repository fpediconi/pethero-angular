import { Routes } from '@angular/router';
import { LoginPage } from './login.page';
import { RegisterOwnerPage } from './register-owner.page';
import { RegisterGuardianPage } from './register-guardian.page';

export const AUTH_ROUTES: Routes = [
  { path: 'login', component: LoginPage },
  { path: 'register-owner', component: RegisterOwnerPage },
  { path: 'register-guardian', component: RegisterGuardianPage }
];