import { Injectable, computed, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, tap } from 'rxjs';
import { environment } from '@env/environment';
import { ApiOk, Customer, User } from '../models';

const TOKEN_KEY = 'fc.accessToken';
const REFRESH_KEY = 'fc.refreshToken';

interface LoginResponse {
  user: User;
  tokens: { accessToken: string; refreshToken: string };
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private http = inject(HttpClient);
  private router = inject(Router);

  private base = environment.apiBaseUrl;

  // Signaux d'état
  readonly user = signal<User | null>(null);
  readonly customer = signal<Customer | null>(null);
  readonly isBootstrapping = signal<boolean>(true);
  readonly isAuthenticated = computed(() => this.user() !== null);

  // ---- Tokens ----
  getAccessToken(): string | null { return localStorage.getItem(TOKEN_KEY); }
  getRefreshToken(): string | null { return localStorage.getItem(REFRESH_KEY); }
  saveTokens(access: string, refresh: string) {
    localStorage.setItem(TOKEN_KEY, access);
    localStorage.setItem(REFRESH_KEY, refresh);
  }
  clearTokens() {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(REFRESH_KEY);
  }

  /**
   * Au démarrage de l'app : tente de recharger l'utilisateur depuis le token stocké.
   */
  bootstrap(): Promise<void> {
    return new Promise((resolve) => {
      if (!this.getAccessToken()) {
        this.isBootstrapping.set(false);
        resolve();
        return;
      }
      this.fetchMe().subscribe({
        next: () => { this.isBootstrapping.set(false); resolve(); },
        error: () => {
          this.clearTokens();
          this.user.set(null);
          this.customer.set(null);
          this.isBootstrapping.set(false);
          resolve();
        },
      });
    });
  }

  fetchMe(): Observable<ApiOk<{ user: User & { customerId?: Customer | null } }>> {
    return this.http.get<ApiOk<{ user: User & { customerId?: Customer | null } }>>(`${this.base}/auth/me`).pipe(
      tap((r) => {
        const u = r.data.user;
        this.user.set(u);
        this.customer.set((typeof u.customerId === 'object' ? (u.customerId as Customer) : null) || null);
      })
    );
  }

  login(email: string, password: string): Observable<ApiOk<LoginResponse>> {
    return this.http.post<ApiOk<LoginResponse>>(`${this.base}/auth/login`, { email: email.trim().toLowerCase(), password })
      .pipe(tap((r) => {
        this.saveTokens(r.data.tokens.accessToken, r.data.tokens.refreshToken);
        this.user.set(r.data.user);
      }));
  }

  register(payload: {
    email: string; password: string; firstName: string; lastName: string;
    phone?: string; clientId?: string;
  }): Observable<ApiOk<{ user: User }>> {
    return this.http.post<ApiOk<{ user: User }>>(`${this.base}/auth/register`, payload);
  }

  logout(): Promise<void> {
    return new Promise((resolve) => {
      const refresh = this.getRefreshToken();
      const finish = () => {
        this.clearTokens();
        this.user.set(null);
        this.customer.set(null);
        this.router.navigateByUrl('/auth/login');
        resolve();
      };
      if (!refresh) return finish();
      this.http.post(`${this.base}/auth/logout`, { refreshToken: refresh }).subscribe({
        next: finish, error: finish,
      });
    });
  }

  refreshAccessToken(): Observable<ApiOk<{ accessToken: string }>> {
    const refresh = this.getRefreshToken();
    return this.http.post<ApiOk<{ accessToken: string }>>(`${this.base}/auth/refresh`, { refreshToken: refresh });
  }
}
