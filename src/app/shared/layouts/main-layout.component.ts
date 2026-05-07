import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatListModule } from '@angular/material/list';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatMenuModule } from '@angular/material/menu';
import { BreakpointObserver, Breakpoints } from '@angular/cdk/layout';
import { AuthService } from '@core/auth/auth.service';
import { toSignal } from '@angular/core/rxjs-interop';
import { map } from 'rxjs';

interface NavItem { path: string; label: string; icon: string; }

@Component({
  selector: 'fca-main-layout',
  standalone: true,
  imports: [
    CommonModule, RouterOutlet, RouterLink, RouterLinkActive,
    MatToolbarModule, MatSidenavModule, MatListModule, MatIconModule,
    MatButtonModule, MatMenuModule,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <mat-sidenav-container class="container">
      <mat-sidenav
        #sidenav
        [mode]="isHandset() ? 'over' : 'side'"
        [opened]="!isHandset()"
        class="sidenav"
        [fixedInViewport]="isHandset()"
      >
        <div class="brand">
          <div class="brand-logo">FCA</div>
          <div>
            <div class="brand-name">FactureChain</div>
            <div class="brand-tag">Console admin</div>
          </div>
        </div>

        <mat-nav-list>
          @for (item of navItems; track item.path) {
            <a mat-list-item
               [routerLink]="item.path"
               routerLinkActive="active"
               (click)="isHandset() && sidenav.close()">
              <mat-icon matListItemIcon>{{ item.icon }}</mat-icon>
              <span matListItemTitle>{{ item.label }}</span>
            </a>
          }
        </mat-nav-list>

        <div class="spacer"></div>

        <div class="user-card">
          <div class="avatar">{{ initials() }}</div>
          <div class="user-meta">
            <div class="user-name">{{ user()?.firstName }} {{ user()?.lastName }}</div>
            <div><span class="role-badge">{{ roleLabel() }}</span></div>
          </div>
        </div>
      </mat-sidenav>

      <mat-sidenav-content>
        <mat-toolbar color="primary" class="toolbar">
          @if (isHandset()) {
            <button mat-icon-button (click)="sidenav.toggle()">
              <mat-icon>menu</mat-icon>
            </button>
          }
          <span class="toolbar-spacer"></span>

          <button mat-icon-button [matMenuTriggerFor]="profileMenu" aria-label="Profil">
            <mat-icon>account_circle</mat-icon>
          </button>
          <mat-menu #profileMenu="matMenu">
            <div class="menu-info">
              <strong>{{ user()?.firstName }} {{ user()?.lastName }}</strong>
              <small>{{ user()?.email }}</small>
            </div>
            <button mat-menu-item (click)="logout()">
              <mat-icon>logout</mat-icon> Se déconnecter
            </button>
          </mat-menu>
        </mat-toolbar>

        <main class="content">
          <router-outlet />
        </main>
      </mat-sidenav-content>
    </mat-sidenav-container>
  `,
  styles: [`
    :host { display: block; height: 100vh; }
    .container { height: 100vh; }
    .sidenav {
      width: 260px;
      background: #0F172A;
      border-right: 1px solid #1E293B;
      display: flex; flex-direction: column;
      color: #E2E8F0;
    }
    .brand {
      display: flex; align-items: center; gap: 12px;
      padding: 20px 16px; border-bottom: 1px solid #1E293B;
    }
    .brand-logo {
      width: 44px; height: 44px; border-radius: 12px;
      background: var(--fc-primary); color: #fff;
      display: flex; align-items: center; justify-content: center;
      font-size: 16px; font-weight: 700;
    }
    .brand-name { font-size: 16px; font-weight: 700; color: #fff; }
    .brand-tag { font-size: 11px; color: #94A3B8; text-transform: uppercase; letter-spacing: 0.5px; }

    .sidenav ::ng-deep .mat-mdc-list-item .mdc-list-item__primary-text { color: #CBD5E1 !important; }
    .sidenav ::ng-deep .mat-mdc-list-item .mat-icon { color: #94A3B8 !important; }
    .active {
      background: rgba(11, 95, 255, 0.18) !important;
    }
    .active ::ng-deep .mdc-list-item__primary-text { color: #fff !important; }
    .active ::ng-deep .mat-icon { color: var(--fc-primary) !important; }

    .spacer { flex: 1; }
    .user-card {
      display: flex; align-items: center; gap: 10px;
      padding: 12px 16px; border-top: 1px solid #1E293B;
    }
    .avatar {
      width: 36px; height: 36px; border-radius: 18px;
      background: var(--fc-primary); color: #fff;
      display: flex; align-items: center; justify-content: center;
      font-weight: 700; font-size: 13px;
    }
    .user-meta { min-width: 0; flex: 1; }
    .user-name { font-size: 13px; font-weight: 600; color: #fff; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .role-badge {
      display: inline-block;
      background: var(--fc-secondary); color: #fff;
      padding: 1px 8px; border-radius: 999px;
      font-size: 10px; font-weight: 700; text-transform: uppercase;
      margin-top: 2px;
    }
    .toolbar { box-shadow: var(--fc-shadow-sm); position: sticky; top: 0; z-index: 10; }
    .toolbar-spacer { flex: 1; }
    .content { padding: 24px; min-height: calc(100vh - 64px); background: var(--fc-bg); }
    @media (max-width: 600px) { .content { padding: 16px; } }
    .menu-info { padding: 8px 16px; border-bottom: 1px solid var(--fc-border); }
    .menu-info strong { display: block; font-size: 13px; }
    .menu-info small { color: var(--fc-text-muted); }
  `],
})
export class MainLayoutComponent {
  private auth = inject(AuthService);
  private bp = inject(BreakpointObserver);

  protected readonly user = this.auth.user;

  protected readonly isHandset = toSignal(
    this.bp.observe(Breakpoints.Handset).pipe(map((r) => r.matches)),
    { initialValue: false }
  );

  protected readonly initials = computed(() => {
    const u = this.auth.user();
    return `${(u?.firstName?.[0] || '').toUpperCase()}${(u?.lastName?.[0] || '').toUpperCase()}` || 'A';
  });

  protected readonly roleLabel = computed(() => {
    const r = this.auth.user()?.role;
    return r === 'admin' ? 'Administrateur' : r === 'agent' ? 'Agent' : '';
  });

  protected readonly navItems: NavItem[] = [
    { path: '/dashboard',     label: 'Tableau de bord', icon: 'space_dashboard' },
    { path: '/claims',        label: 'Réclamations',    icon: 'support_agent' },
    { path: '/users',         label: 'Utilisateurs',    icon: 'group' },
    { path: '/customers',     label: 'Clients ENEO',    icon: 'badge' },
    { path: '/outages',       label: 'Coupures',        icon: 'flash_off' },
    { path: '/announcements', label: 'Annonces',        icon: 'campaign' },
  ];

  protected logout() { this.auth.logout(); }
}
