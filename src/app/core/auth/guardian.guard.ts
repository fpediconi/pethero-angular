import { CanActivateFn, Router } from '@angular/router';
import { inject } from '@angular/core';
import { AuthService } from './auth.service';

export const guardianGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  const u = auth.user();
  if (u && u.role === 'guardian') return true;
  alert('Función disponible para guardianes');
  router.navigateByUrl('/home');
  return false;
};

