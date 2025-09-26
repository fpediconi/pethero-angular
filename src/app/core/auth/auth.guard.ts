import { CanActivateFn, Router, UrlTree } from '@angular/router';
import { inject } from '@angular/core';
import { AuthService } from './auth.service';
import { catchError, map, of } from 'rxjs';

export const authGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);

  if (auth.isLoggedIn()) {
    return true;
  }

  if (!auth.hasToken()) {
    return redirectToLogin(router);
  }

  return auth.loadSession().pipe(
    map((user) => (user ? true : redirectToLogin(router))),
    catchError(() => of(redirectToLogin(router)))
  );
};

const redirectToLogin = (router: Router): UrlTree => router.createUrlTree(['/auth/login']);
