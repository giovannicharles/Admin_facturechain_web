import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatChipsModule } from '@angular/material/chips';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar } from '@angular/material/snack-bar';
import { AdminApi } from '@core/api/admin-api';
import { PowerOutage } from '@core/models';
import { FcDatePipe, RelativeTimePipe } from '@shared/pipes/format.pipes';
import { BadgeComponent } from '@shared/components/badges.component';

@Component({
  selector: 'fca-admin-outages',
  standalone: true,
  imports: [
    CommonModule, FormsModule,
    MatCardModule, MatIconModule, MatButtonModule, MatChipsModule, MatProgressSpinnerModule,
    FcDatePipe, RelativeTimePipe, BadgeComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="fc-page">
      <div class="head">
        <h1>Modération des coupures</h1>
        <p>Marquer les coupures comme rétablies une fois confirmé sur le terrain.</p>
      </div>

      <mat-chip-listbox [(ngModel)]="filter" (ngModelChange)="load()">
        <mat-chip-option [value]="'active'" selected>En cours</mat-chip-option>
        <mat-chip-option [value]="'all'">Toutes</mat-chip-option>
      </mat-chip-listbox>

      @if (loading()) {
        <div class="loader"><mat-spinner diameter="40" /></div>
      } @else if (outages().length === 0) {
        <mat-card><mat-card-content>
          <div class="empty">
            <mat-icon>flash_on</mat-icon>
            <p>Aucune coupure {{ filter === 'active' ? 'en cours' : '' }}</p>
          </div>
        </mat-card-content></mat-card>
      } @else {
        <div class="list">
          @for (o of outages(); track o._id) {
            <mat-card>
              <mat-card-content>
                <div class="row">
                  <div class="ico" [class.resolved]="o.status === 'resolved'">
                    <mat-icon>{{ o.status === 'resolved' ? 'check_circle' : 'flash_off' }}</mat-icon>
                  </div>
                  <div class="body">
                    <div class="loc">
                      @if (o.neighborhood) { {{ o.neighborhood }} · }
                      {{ o.city }}
                    </div>
                    <div class="region">{{ o.region }}</div>
                    <div class="meta">
                      <fca-badge
                        [label]="o.status === 'resolved' ? 'Rétabli' : (o.status === 'confirmed' ? 'Confirmée' : 'Signalée')"
                        [tone]="o.status === 'resolved' ? 'success' : (o.status === 'confirmed' ? 'danger' : 'warning')" />
                      <span class="confirms">{{ o.confirmations }} confirmation{{ o.confirmations > 1 ? 's' : '' }}</span>
                      @if (o.isOfficial) {
                        <fca-badge label="Officiel" tone="primary" />
                      }
                    </div>
                    <div class="time">
                      Début {{ o.startTime | fcRelative }}
                      @if (o.endTime) { · Fin {{ o.endTime | fcDate: true }} }
                    </div>
                    @if (o.description) { <p class="desc">{{ o.description }}</p> }
                  </div>
                  @if (o.status !== 'resolved') {
                    <button mat-flat-button color="primary" (click)="resolve(o._id)">
                      <mat-icon>check</mat-icon> Marquer rétabli
                    </button>
                  }
                </div>
              </mat-card-content>
            </mat-card>
          }
        </div>
      }
    </div>
  `,
  styles: [`
    .head { margin-bottom: 16px; }
    .head h1 { font-size: 24px; font-weight: 700; margin: 0; }
    .head p { color: var(--fc-text-secondary); margin: 4px 0 0; font-size: 13px; }
    mat-chip-listbox { margin-bottom: 16px; }
    .loader { display: flex; justify-content: center; padding: 64px; }
    .empty { text-align: center; padding: 48px; color: var(--fc-text-secondary); }
    .empty mat-icon { font-size: 48px; height: 48px; width: 48px; color: var(--fc-success); }
    .empty p { font-weight: 600; margin: 12px 0 4px; }
    .list { display: flex; flex-direction: column; gap: 10px; }
    .row { display: flex; gap: 16px; align-items: flex-start; }
    .ico {
      width: 48px; height: 48px; border-radius: 12px; flex-shrink: 0;
      background: var(--fc-danger-soft); color: var(--fc-danger);
      display: flex; align-items: center; justify-content: center;
    }
    .ico.resolved { background: var(--fc-success-soft); color: var(--fc-success); }
    .body { flex: 1; min-width: 0; }
    .loc { font-weight: 600; font-size: 16px; }
    .region { color: var(--fc-text-muted); font-size: 13px; }
    .meta { display: flex; align-items: center; gap: 8px; margin-top: 6px; flex-wrap: wrap; }
    .confirms { font-size: 12px; color: var(--fc-text-muted); }
    .time { font-size: 12px; color: var(--fc-text-muted); margin-top: 4px; }
    .desc { font-size: 13px; margin: 8px 0 0; color: var(--fc-text-secondary); line-height: 1.4; }
  `],
})
export class AdminOutagesComponent {
  private adminApi = inject(AdminApi);
  private snack = inject(MatSnackBar);

  protected loading = signal(true);
  protected outages = signal<PowerOutage[]>([]);
  protected filter: 'active' | 'all' = 'active';

  constructor() { this.load(); }

  load() {
    this.loading.set(true);
    this.adminApi.listOutages(this.filter === 'active').subscribe({
      next: (r) => { this.outages.set(r.data); this.loading.set(false); },
      error: () => this.loading.set(false),
    });
  }

  resolve(id: string) {
    this.adminApi.resolveOutage(id).subscribe({
      next: (r) => {
        this.outages.update((list) => list.map((o) => (o._id === id ? r.data.outage : o)));
        this.snack.open('Coupure marquée comme rétablie', 'OK',
          { duration: 3000, panelClass: 'fc-snack-success' });
      },
      error: () => this.snack.open('Échec', 'OK', { duration: 3000, panelClass: 'fc-snack-error' }),
    });
  }
}
