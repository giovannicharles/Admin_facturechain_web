import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { AdminApi } from '@core/api/admin-api';
import { Claim, ClaimStatus } from '@core/models';
import { RelativeTimePipe } from '@shared/pipes/format.pipes';
import { ClaimStatusBadgeComponent, BadgeComponent } from '@shared/components/badges.component';

@Component({
  selector: 'fca-admin-claims-list',
  standalone: true,
  imports: [
    CommonModule, RouterLink, FormsModule,
    MatCardModule, MatIconModule, MatButtonModule,
    MatFormFieldModule, MatSelectModule, MatProgressSpinnerModule,
    RelativeTimePipe, ClaimStatusBadgeComponent, BadgeComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="fc-page">
      <div class="head">
        <div>
          <h1>Console réclamations</h1>
          <p>{{ claims().length }} réclamation{{ claims().length > 1 ? 's' : '' }} affichée{{ claims().length > 1 ? 's' : '' }}</p>
        </div>
      </div>

      <mat-card class="filters">
        <mat-card-content>
          <mat-form-field>
            <mat-label>Statut</mat-label>
            <mat-select [(ngModel)]="filterStatus" (ngModelChange)="load()">
              <mat-option [value]="''">Tous</mat-option>
              @for (s of statuses; track s) { <mat-option [value]="s">{{ statusLabel(s) }}</mat-option> }
            </mat-select>
          </mat-form-field>
          <mat-form-field>
            <mat-label>Priorité</mat-label>
            <mat-select [(ngModel)]="filterPriority" (ngModelChange)="load()">
              <mat-option [value]="''">Toutes</mat-option>
              <mat-option value="low">Faible</mat-option>
              <mat-option value="medium">Moyenne</mat-option>
              <mat-option value="high">Élevée</mat-option>
            </mat-select>
          </mat-form-field>
        </mat-card-content>
      </mat-card>

      @if (loading()) {
        <div class="loader"><mat-spinner diameter="40" /></div>
      } @else if (claims().length === 0) {
        <mat-card>
          <mat-card-content>
            <div class="empty">
              <mat-icon>inbox</mat-icon>
              <p>Aucune réclamation pour ces filtres</p>
            </div>
          </mat-card-content>
        </mat-card>
      } @else {
        <div class="list">
          @for (c of claims(); track c._id) {
            <a [routerLink]="['/claims', c._id]" class="card-link">
              <mat-card>
                <mat-card-content>
                  <div class="row">
                    <div class="num-col">
                      <div class="num">{{ c.claimNumber }}</div>
                      <div class="time">{{ c.submittedAt | fcRelative }}</div>
                    </div>
                    <div class="main">
                      <div class="title">{{ c.title }}</div>
                      <div class="desc">{{ c.description }}</div>
                      <div class="meta">
                        @if (c.priority === 'high') { <fca-badge label="Priorité élevée" tone="danger" /> }
                        @if (c.priority === 'medium') { <fca-badge label="Priorité moyenne" tone="warning" /> }
                        @if (c.eneoTransmissionRef) { <fca-badge label="Ref ENEO" tone="primary" /> }
                      </div>
                    </div>
                    <div class="status-col">
                      <fca-claim-status-badge [status]="c.status" />
                    </div>
                  </div>
                </mat-card-content>
              </mat-card>
            </a>
          }
        </div>
      }
    </div>
  `,
  styles: [`
    .head { margin-bottom: 16px; }
    .head h1 { font-size: 24px; font-weight: 700; margin: 0; }
    .head p { color: var(--fc-text-muted); margin: 4px 0 0; font-size: 13px; }
    .filters { margin-bottom: 16px; }
    .filters mat-card-content { display: flex; gap: 16px; flex-wrap: wrap; }
    .filters mat-form-field { min-width: 200px; }
    .loader { display: flex; justify-content: center; padding: 64px; }
    .empty { text-align: center; padding: 48px; color: var(--fc-text-secondary); }
    .empty mat-icon { font-size: 48px; height: 48px; width: 48px; color: var(--fc-text-muted); }
    .empty p { font-weight: 600; margin: 12px 0 4px; }
    .list { display: flex; flex-direction: column; gap: 10px; }
    .card-link { color: inherit; }
    .card-link:hover { text-decoration: none; }
    .card-link mat-card { transition: transform 0.15s, box-shadow 0.15s; cursor: pointer; }
    .card-link:hover mat-card { transform: translateY(-2px); box-shadow: var(--fc-shadow-md) !important; }
    .row { display: grid; grid-template-columns: 140px 1fr 160px; gap: 16px; align-items: center; }
    @media (max-width: 700px) { .row { grid-template-columns: 1fr; } }
    .num-col { text-align: left; }
    .num { font-size: 11px; font-weight: 700; color: var(--fc-text-secondary); }
    .time { font-size: 11px; color: var(--fc-text-muted); margin-top: 2px; }
    .main { min-width: 0; }
    .title { font-weight: 600; font-size: 15px; }
    .desc { color: var(--fc-text-secondary); font-size: 13px; line-height: 1.4; max-height: 36px; overflow: hidden; }
    .meta { display: flex; gap: 6px; margin-top: 8px; flex-wrap: wrap; }
    .status-col { text-align: right; }
  `],
})
export class AdminClaimsListComponent {
  private adminApi = inject(AdminApi);

  protected loading = signal(true);
  protected claims = signal<Claim[]>([]);

  protected filterStatus: ClaimStatus | '' = '';
  protected filterPriority: 'low' | 'medium' | 'high' | '' = '';

  protected statuses: ClaimStatus[] = [
    'submitted', 'received', 'investigating', 'transmitted_to_eneo',
    'awaiting_response', 'resolved', 'rejected', 'closed',
  ];

  constructor() { this.load(); }

  load() {
    this.loading.set(true);
    this.adminApi.listClaims({
      status: this.filterStatus || undefined,
      priority: this.filterPriority || undefined,
      limit: 50,
    }).subscribe({
      next: (r) => { this.claims.set(r.data); this.loading.set(false); },
      error: () => this.loading.set(false),
    });
  }

  protected statusLabel(s: ClaimStatus): string {
    return ({
      submitted: 'Soumise', received: 'Reçue', investigating: 'En analyse',
      transmitted_to_eneo: 'Transmise ENEO', awaiting_response: 'Attente ENEO',
      resolved: 'Résolue', rejected: 'Rejetée', closed: 'Clôturée',
    } as const)[s];
  }
}
