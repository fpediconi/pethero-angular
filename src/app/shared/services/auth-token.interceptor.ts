import { HttpInterceptorFn } from '@angular/common/http';

export const authTokenInterceptor: HttpInterceptorFn = (req, next) => {
  try {
    const token = sessionStorage.getItem('pethero_token');
    if (!token) return next(req);
    return next(req.clone({ setHeaders: { Authorization: `Bearer ${token}` }}));
  } catch {
    // sessionStorage puede no estar accesible en algunos contextos (SSR, tests)
    return next(req);
  }
};
