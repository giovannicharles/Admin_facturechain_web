import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatButtonModule } from '@angular/material/button';
import { AdminApi, AdminDashboardStats } from '@core/api/admin-api';
import { AuthService } from '@core/auth/auth.service';

@Component({
  selector: 'fca-admin-dashboard',
  standalone: true,
  imports: [
    CommonModule, RouterLink,
    MatCardModule, MatIconModule, MatProgressSpinnerModule, MatButtonModule,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="fc-page">
      <div class="head">
        <div>
          <h1>Tableau de bord</h1>
          <p>Bienvenue {{ auth.user()?.firstName }} — voici un aperçu temps réel.</p>
        </div>
      </div>

      @if (loading()) {
        <div class="loader"><mat-spinner diameter="40" /></div>
      } @else {
        @if (stats(); as s) {
        <!-- KPIs principaux -->
        <div class="kpi-grid">
          <div class="kpi-card primary">
            <div class="kpi-ico"><mat-icon>group</mat-icon></div>
            <div class="kpi-body">
              <div class="kpi-val">{{ s.users?.total ?? 0 }}</div>
              <div class="kpi-lbl">Utilisateurs</div>
              <div class="kpi-sub">{{ s.users?.active ?? 0 }} actifs · {{ s.users?.suspended ?? 0 }} suspendus</div>
            </div>
          </div>
          <div class="kpi-card success">
            <div class="kpi-ico"><mat-icon>badge</mat-icon></div>
            <div class="kpi-body">
              <div class="kpi-val">{{ s.customers.total }}</div>
              <div class="kpi-lbl">Clients ENEO</div>
              <div class="kpi-sub">{{ s.meters.active }} compteurs actifs</div>
            </div>
          </div>
          <div class="kpi-card warning">
            <div class="kpi-ico"><mat-icon>warning</mat-icon></div>
            <div class="kpi-body">
              <div class="kpi-val">{{ s.anomalies.unresolved }}</div>
              <div class="kpi-lbl">Anomalies ouvertes</div>
              <div class="kpi-sub">{{ s.anomalies.high }} sévérité élevée · {{ s.anomalies.total }} total</div>
            </div>
          </div>
          <div class="kpi-card danger">
            <div class="kpi-ico"><mat-icon>flash_off</mat-icon></div>
            <div class="kpi-body">
              <div class="kpi-val">{{ s.outages.active }}</div>
              <div class="kpi-lbl">Coupures en cours</div>
              <div class="kpi-sub">{{ s.outages.lastWeek }} cette semaine</div>
            </div>
          </div>
        </div>

        <!-- Réclamations par statut -->
        <mat-card class="claims-card">
          <mat-card-content>
            <div class="card-head">
              <div>
                <h2>Réclamations en cours</h2>
                <p>{{ s.claims.open }} ouvertes sur {{ s.claims.total }} au total</p>
              </div>
              <a mat-flat-button color="primary" routerLink="/claims">
                <mat-icon>support_agent</mat-icon>
                Console réclamations
              </a>
            </div>

            <div class="status-grid">
              @for (entry of statusEntries(); track entry.key) {
                <div class="status-tile">
                  <div class="status-val" [style.color]="entry.color">{{ entry.value }}</div>
                  <div class="status-lbl">{{ entry.label }}</div>
                </div>
              }
            </div>
          </mat-card-content>
        </mat-card>

        <!-- Cartes accès rapide -->
        <div class="quick-grid">
          <a routerLink="/users" class="quick-tile">
            <mat-icon>group</mat-icon>
            <strong>Utilisateurs</strong>
            <small>Activer / suspendre les comptes</small>
          </a>
          <a routerLink="/customers" class="quick-tile">
            <mat-icon>badge</mat-icon>
            <strong>Clients ENEO</strong>
            <small>Recherche & rattachements</small>
          </a>
          <a routerLink="/outages" class="quick-tile">
            <mat-icon>flash_off</mat-icon>
            <strong>Coupures</strong>
            <small>Modération des signalements</small>
          </a>
          <a routerLink="/announcements" class="quick-tile">
            <mat-icon>campaign</mat-icon>
            <strong>Annonces</strong>
            <small>Communications publiques</small>
          </a>
        </div>
        }
      }
    </div>
  `,
  styles: [`
    .head { margin-bottom: 24px; }
    .head h1 { font-size: 26px; font-weight: 700; margin: 0; }
    .head p { color: var(--fc-text-secondary); margin: 4px 0 0; }
    .loader { display: flex; justify-content: center; padding: 64px; }

    .kpi-grid {
      display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
      gap: 16px; margin-bottom: 24px;
    }
    .kpi-card {
      display: flex; gap: 16px; align-items: center;
      background: #fff; padding: 20px; border-radius: 14px;
      box-shadow: var(--fc-shadow-sm);
      border-left: 4px solid;
    }
    .kpi-card.primary  { border-left-color: var(--fc-primary); }
    .kpi-card.success  { border-left-color: var(--fc-secondary); }
    .kpi-card.warning  { border-left-color: var(--fc-warning); }
    .kpi-card.danger   { border-left-color: var(--fc-danger); }
    .kpi-ico {
      width: 48px; height: 48px; border-radius: 12px;
      background: var(--fc-surface-alt);
      display: flex; align-items: center; justify-content: center;
    }
    .kpi-card.primary  .kpi-ico { background: var(--fc-primary-soft); color: var(--fc-primary); }
    .kpi-card.success  .kpi-ico { background: var(--fc-secondary-soft); color: var(--fc-secondary); }
    .kpi-card.warning  .kpi-ico { background: var(--fc-warning-soft); color: var(--fc-warning); }
    .kpi-card.danger   .kpi-ico { background: var(--fc-danger-soft); color: var(--fc-danger); }
    .kpi-val { font-size: 26px; font-weight: 700; line-height: 1; }
    .kpi-lbl { font-size: 13px; color: var(--fc-text-secondary); margin-top: 2px; font-weight: 500; }
    .kpi-sub { font-size: 11px; color: var(--fc-text-muted); margin-top: 4px; }

    .claims-card { margin-bottom: 24px; }
    .card-head { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; gap: 16px; flex-wrap: wrap; }
    .card-head h2 { margin: 0; font-size: 18px; font-weight: 600; }
    .card-head p { color: var(--fc-text-muted); margin: 4px 0 0; font-size: 13px; }

    .status-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(140px, 1fr)); gap: 8px; }
    .status-tile {
      padding: 14px; background: var(--fc-surface-alt);
      border-radius: 10px; text-align: center;
    }
    .status-val { font-size: 24px; font-weight: 700; }
    .status-lbl { font-size: 11px; color: var(--fc-text-muted); margin-top: 2px; text-transform: uppercase; letter-spacing: 0.3px; }

    .quick-grid {
      display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 12px;
    }
    .quick-tile {
      display: flex; flex-direction: column; align-items: center; gap: 4px;
      padding: 24px; background: #fff; border-radius: 12px;
      color: var(--fc-text); text-align: center;
      box-shadow: var(--fc-shadow-sm);
      transition: transform 0.15s, box-shadow 0.15s;
    }
    .quick-tile:hover { transform: translateY(-3px); box-shadow: var(--fc-shadow-md); text-decoration: none; }
    .quick-tile mat-icon {
      font-size: 28px; height: 28px; width: 28px; color: var(--fc-primary); margin-bottom: 8px;
    }
    .quick-tile strong { font-size: 14px; }
    .quick-tile small { color: var(--fc-text-muted); font-size: 12px; }
  `],
})
export class AdminDashboardComponent {
  protected auth = inject(AuthService);
  private adminApi = inject(AdminApi);

  protected loading = signal(true);
  protected stats = signal<AdminDashboardStats | null>(null);

  protected statusEntries = computed(() => {
    const s = this.stats();
    if (!s) return [];
    const palette: Record<string, string> = {
      submitted: '#0EA5E9', received: 'var(--fc-primary)',
      investigating: 'var(--fc-warning)', transmitted_to_eneo: 'var(--fc-primary)',
      awaiting_response: 'var(--fc-warning)', resolved: 'var(--fc-secondary)',
      rejected: 'var(--fc-danger)', closed: '#94A3B8',
    };
    const labels: Record<string, string> = {
      submitted: 'Soumises', received: 'Reçues', investigating: 'En analyse',
      transmitted_to_eneo: 'Transmises', awaiting_response: 'Attente',
      resolved: 'Résolues', rejected: 'Rejetées', closed: 'Clôturées',
    };
    return Object.entries(s.claims.byStatus).map(([key, value]) => ({
      key, value, label: labels[key] || key, color: palette[key] || '#475569',
    }));
  });

  constructor() {
    this.adminApi.dashboard().subscribe({
      next: (r) => { this.stats.set(r.data); this.loading.set(false); },
      error: () => this.loading.set(false),
    });
  }
}
