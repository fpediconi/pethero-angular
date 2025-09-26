import { CanActivateFn, Router, UrlTree } from '@angular/router';
import { inject } from '@angular/core';
import { AuthService } from './auth.service';
import { catchError, map, of } from 'rxjs';

export const ownerGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);

  const deny = (): UrlTree => {
    if (typeof window !== 'undefined') {
      alert('Funcion disponible para duenos (Owners)');
    }
    return redirectHome(router);
  };

  const allow = (userRole: string | undefined | null) => (userRole === 'owner' ? true : deny());

  const current = auth.user();
  if (current) {
    return allow(current.role);
  }

  if (!auth.hasToken()) {
    return deny();
  }

  return auth.loadSession().pipe(
    map((user) => allow(user?.role ?? null)),
    catchError(() => of(deny()))
  );
};

const redirectHome = (router: Router): UrlTree => router.createUrlTree(['/home']);
