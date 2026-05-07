import { HttpEvent, HttpHandlerFn, HttpInterceptorFn, HttpRequest } from '@angular/common/http';
import { inject } from '@angular/core';
import { BehaviorSubject, Observable, catchError, filter, switchMap, take, throwError } from 'rxjs';
import { AuthService } from '../auth/auth.service';
import { Router } from '@angular/router';
import { environment } from '@env/environment';

let isRefreshing = false;
const refreshed$ = new BehaviorSubject<string | null>(null);

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(AuthService);
  const router = inject(Router);

  const token = auth.getAccessToken();
  const isApi = req.url.startsWith(environment.apiBaseUrl);
  const authedReq = isApi && token ? withAuth(req, token) : req;

  return next(authedReq).pipe(
    catchError((err) => {
      if (!isApi || err.status !== 401 || req.url.includes('/auth/refresh') || req.url.includes('/auth/login')) {
        return throwError(() => err);
      }
      return handle401(req, next, auth, router);
    })
  );
};

function withAuth(req: HttpRequest<unknown>, token: string): HttpRequest<unknown> {
  return req.clone({ setHeaders: { Authorization: `Bearer ${token}` } });
}

function handle401(
  req: HttpRequest<unknown>,
  next: HttpHandlerFn,
  auth: AuthService,
  router: Router,
): Observable<HttpEvent<unknown>> {
  if (!isRefreshing) {
    isRefreshing = true;
    refreshed$.next(null);

    return auth.refreshAccessToken().pipe(
      switchMap((r) => {
        const newToken = r.data.accessToken;
        localStorage.setItem('fc.accessToken', newToken);
        isRefreshing = false;
        refreshed$.next(newToken);
        return next(withAuth(req, newToken));
      }),
      catchError((e) => {
        isRefreshing = false;
        auth.clearTokens();
        router.navigateByUrl('/auth/login');
        return throwError(() => e);
      })
    );
  }

  return refreshed$.pipe(
    filter((t): t is string => t !== null),
    take(1),
    switchMap((token) => next(withAuth(req, token))),
  );
}
