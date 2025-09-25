import { CanActivateFn, Router } from '@angular/router';
import { inject } from '@angular/core';
import { AuthService } from './auth.service';

export const ownerGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  const u = auth.user();
  if (u && u.role === 'owner') return true;
  alert('Funcion disponible para duenos (Owners)');
  router.navigateByUrl('/home');
  return false;
};

