import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { Subject, debounceTime } from 'rxjs';
import { AdminApi } from '@core/api/admin-api';
import { Customer } from '@core/models';
import { BadgeComponent } from '@shared/components/badges.component';

@Component({
  selector: 'fca-admin-customers',
  standalone: true,
  imports: [
    CommonModule, FormsModule,
    MatCardModule, MatIconModule, MatFormFieldModule, MatInputModule,
    MatProgressSpinnerModule, BadgeComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="fc-page">
      <div class="head">
        <h1>Clients ENEO</h1>
        <p>Annuaire des clients (résidentiels, commerciaux, industriels)</p>
      </div>

      <mat-card class="filters">
        <mat-card-content>
          <mat-form-field class="grow">
            <mat-label>Rechercher (nom, identifiant, ville)</mat-label>
            <input matInput [(ngModel)]="search" (ngModelChange)="onSearchChange()" />
            <mat-icon matSuffix>search</mat-icon>
          </mat-form-field>
        </mat-card-content>
      </mat-card>

      @if (loading()) {
        <div class="loader"><mat-spinner diameter="40" /></div>
      } @else {
        <div class="grid">
          @for (c of customers(); track c._id) {
            <mat-card>
              <mat-card-content>
                <div class="head-row">
                  <div>
                    <div class="client-id">{{ c.clientId }}</div>
                    <div class="name">{{ c.firstName }} {{ c.lastName }}</div>
                  </div>
                  <fca-badge
                    [label]="typeLabel(c.customerType)"
                    [tone]="c.customerType === 'industrial' ? 'danger' : (c.customerType === 'commercial' ? 'warning' : 'primary')" />
                </div>
                <div class="info">
                  @if (c.phone) {
                    <div><mat-icon>phone</mat-icon><span>{{ c.phone }}</span></div>
                  }
                  @if (c.email) {
                    <div><mat-icon>mail</mat-icon><span>{{ c.email }}</span></div>
                  }
                  @if (c.address) {
                    <div>
                      <mat-icon>location_on</mat-icon>
                      <span>{{ formatAddress(c.address) }}</span>
                    </div>
                  }
                </div>
              </mat-card-content>
            </mat-card>
          } @empty {
            <mat-card><mat-card-content>
              <div class="empty">
                <mat-icon>person_search</mat-icon>
                <p>Aucun client</p>
              </div>
            </mat-card-content></mat-card>
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
    .grow { width: 100%; }
    .loader { display: flex; justify-content: center; padding: 64px; }

    .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); gap: 12px; }
    .head-row { display: flex; justify-content: space-between; align-items: flex-start; gap: 8px; margin-bottom: 12px; }
    .client-id { font-size: 11px; font-weight: 700; color: var(--fc-text-muted); }
    .name { font-size: 16px; font-weight: 600; margin-top: 2px; }
    .info { display: flex; flex-direction: column; gap: 6px; padding: 12px; background: var(--fc-surface-alt); border-radius: 8px; }
    .info > div { display: flex; align-items: center; gap: 8px; font-size: 13px; color: var(--fc-text-secondary); }
    .info mat-icon { font-size: 16px; height: 16px; width: 16px; color: var(--fc-text-muted); }

    .empty { text-align: center; padding: 48px 16px; color: var(--fc-text-muted); }
    .empty mat-icon { font-size: 48px; height: 48px; width: 48px; }
    .empty p { font-weight: 600; margin: 12px 0 0; }
  `],
})
export class AdminCustomersComponent {
  private adminApi = inject(AdminApi);

  protected loading = signal(true);
  protected customers = signal<Customer[]>([]);
  protected search = '';

  private searchSubject = new Subject<void>();

  constructor() {
    this.searchSubject.pipe(debounceTime(300)).subscribe(() => this.load());
    this.load();
  }

  protected onSearchChange() { this.searchSubject.next(); }

  load() {
    this.loading.set(true);
    this.adminApi.listCustomers(this.search.trim() || undefined, 1, 50).subscribe({
      next: (r) => { this.customers.set(r.data); this.loading.set(false); },
      error: () => this.loading.set(false),
    });
  }

  protected typeLabel(t: string): string {
    return ({ residential: 'Résidentiel', commercial: 'Commercial', industrial: 'Industriel' } as Record<string, string>)[t] || t;
  }
  protected formatAddress(a: { neighborhood?: string; city?: string; region?: string }): string {
    return [a.neighborhood, a.city, a.region].filter(Boolean).join(', ') || '—';
  }
}
