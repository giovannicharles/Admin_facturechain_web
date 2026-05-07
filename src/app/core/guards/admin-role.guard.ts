import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../auth/auth.service';

export const adminRoleGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  const user = auth.user();
  if (!user) return router.parseUrl('/auth/login');
  if (user.role === 'admin' || user.role === 'agent') return true;
  // Sinon déconnecte (cas d'un abonné qui aurait scanné l'URL admin)
  auth.clearTokens();
  return router.parseUrl('/auth/login');
};
