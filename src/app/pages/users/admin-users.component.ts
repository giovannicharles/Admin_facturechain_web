import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Subject, debounceTime } from 'rxjs';
import { AdminApi } from '@core/api/admin-api';
import { User } from '@core/models';
import { BadgeComponent } from '@shared/components/badges.component';

@Component({
  selector: 'fca-admin-users',
  standalone: true,
  imports: [
    CommonModule, FormsModule,
    MatCardModule, MatIconModule, MatButtonModule,
    MatFormFieldModule, MatInputModule, MatSelectModule, MatProgressSpinnerModule,
    BadgeComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="fc-page">
      <div class="head">
        <h1>Utilisateurs</h1>
        <p>{{ users().length }} compte{{ users().length > 1 ? 's' : '' }}</p>
      </div>

      <mat-card class="filters">
        <mat-card-content>
          <mat-form-field class="grow">
            <mat-label>Rechercher (nom, email)</mat-label>
            <input matInput [(ngModel)]="search" (ngModelChange)="onSearchChange()" />
            <mat-icon matSuffix>search</mat-icon>
          </mat-form-field>
          <mat-form-field>
            <mat-label>Rôle</mat-label>
            <mat-select [(ngModel)]="filterRole" (ngModelChange)="load()">
              <mat-option [value]="''">Tous</mat-option>
              <mat-option value="subscriber">Abonnés</mat-option>
              <mat-option value="agent">Agents</mat-option>
              <mat-option value="admin">Admins</mat-option>
            </mat-select>
          </mat-form-field>
          <mat-form-field>
            <mat-label>Statut</mat-label>
            <mat-select [(ngModel)]="filterStatus" (ngModelChange)="load()">
              <mat-option [value]="''">Tous</mat-option>
              <mat-option value="active">Actifs</mat-option>
              <mat-option value="pending">En attente</mat-option>
              <mat-option value="suspended">Suspendus</mat-option>
            </mat-select>
          </mat-form-field>
        </mat-card-content>
      </mat-card>

      @if (loading()) {
        <div class="loader"><mat-spinner diameter="40" /></div>
      } @else {
        <mat-card>
          <mat-card-content class="no-pad">
            <table class="users">
              <thead>
                <tr><th>Utilisateur</th><th>Email</th><th>Rôle</th><th>Statut</th><th class="actions">Actions</th></tr>
              </thead>
              <tbody>
                @for (u of users(); track u._id) {
                  <tr>
                    <td>
                      <div class="user-cell">
                        <div class="avatar">{{ initialsOf(u) }}</div>
                        <div>
                          <strong>{{ u.firstName || '—' }} {{ u.lastName || '' }}</strong>
                          @if (u.phone) { <small>{{ u.phone }}</small> }
                        </div>
                      </div>
                    </td>
                    <td><code>{{ u.email }}</code></td>
                    <td>
                      <fca-badge [label]="roleLabel(u.role)" [tone]="roleTone(u.role)" />
                    </td>
                    <td>
                      <fca-badge [label]="statusLabel(u.status)" [tone]="statusTone(u.status)" />
                    </td>
                    <td class="actions">
                      @if (u.status === 'active') {
                        <button mat-stroked-button color="warn" (click)="setStatus(u, 'suspended')">
                          <mat-icon>block</mat-icon> Suspendre
                        </button>
                      } @else if (u.status === 'suspended') {
                        <button mat-stroked-button color="primary" (click)="setStatus(u, 'active')">
                          <mat-icon>check_circle</mat-icon> Réactiver
                        </button>
                      }
                    </td>
                  </tr>
                } @empty {
                  <tr><td colspan="5" class="empty">Aucun utilisateur ne correspond aux filtres.</td></tr>
                }
              </tbody>
            </table>
          </mat-card-content>
        </mat-card>
      }
    </div>
  `,
  styles: [`
    .head { margin-bottom: 16px; }
    .head h1 { font-size: 24px; font-weight: 700; margin: 0; }
    .head p { color: var(--fc-text-muted); margin: 4px 0 0; font-size: 13px; }
    .filters { margin-bottom: 16px; }
    .filters mat-card-content { display: flex; gap: 16px; flex-wrap: wrap; align-items: flex-start; }
    .filters mat-form-field { min-width: 180px; }
    .grow { flex: 1; min-width: 280px !important; }
    .loader { display: flex; justify-content: center; padding: 64px; }
    .no-pad { padding: 0 !important; }
    table.users { width: 100%; border-collapse: collapse; }
    thead { background: var(--fc-surface-alt); }
    th { text-align: left; padding: 12px 16px; font-size: 12px; color: var(--fc-text-secondary); text-transform: uppercase; letter-spacing: 0.3px; }
    th.actions { text-align: right; }
    td { padding: 12px 16px; border-top: 1px solid var(--fc-border); }
    td.actions { text-align: right; }
    td.empty { padding: 48px; text-align: center; color: var(--fc-text-muted); }
    .user-cell { display: flex; align-items: center; gap: 10px; }
    .avatar {
      width: 36px; height: 36px; border-radius: 18px;
      background: var(--fc-primary-soft); color: var(--fc-primary);
      display: flex; align-items: center; justify-content: center;
      font-weight: 700; font-size: 12px;
    }
    .user-cell small { display: block; color: var(--fc-text-muted); font-size: 11px; }
    code { font-family: monospace; font-size: 12px; }
  `],
})
export class AdminUsersComponent {
  private adminApi = inject(AdminApi);
  private snack = inject(MatSnackBar);

  protected loading = signal(true);
  protected users = signal<User[]>([]);

  protected search = '';
  protected filterRole = '';
  protected filterStatus = '';

  private searchSubject = new Subject<void>();

  constructor() {
    this.searchSubject.pipe(debounceTime(300)).subscribe(() => this.load());
    this.load();
  }

  protected onSearchChange() { this.searchSubject.next(); }

  load() {
    this.loading.set(true);
    this.adminApi.listUsers({
      role: this.filterRole || undefined,
      status: this.filterStatus || undefined,
      search: this.search.trim() || undefined,
      limit: 50,
    }).subscribe({
      next: (r) => { this.users.set(r.data); this.loading.set(false); },
      error: () => this.loading.set(false),
    });
  }

  setStatus(u: User, status: 'active' | 'suspended') {
    this.adminApi.setUserStatus(u._id, status).subscribe({
      next: (r) => {
        this.users.update((list) => list.map((x) => (x._id === u._id ? r.data.user : x)));
        this.snack.open(`Compte ${status === 'active' ? 'réactivé' : 'suspendu'}`, 'OK',
          { duration: 3000, panelClass: 'fc-snack-success' });
      },
      error: () => this.snack.open('Échec', 'OK', { duration: 3000, panelClass: 'fc-snack-error' }),
    });
  }

  protected initialsOf(u: User): string {
    return `${(u.firstName?.[0] || '').toUpperCase()}${(u.lastName?.[0] || '').toUpperCase()}` ||
           u.email.slice(0, 2).toUpperCase();
  }

  protected roleLabel(r: string): string {
    return ({ admin: 'Admin', agent: 'Agent', subscriber: 'Abonné' } as Record<string, string>)[r] || r;
  }
  protected roleTone(r: string): 'primary' | 'success' | 'default' {
    return r === 'admin' ? 'primary' : r === 'agent' ? 'success' : 'default';
  }
  protected statusLabel(s: string): string {
    return ({ active: 'Actif', suspended: 'Suspendu', pending: 'En attente' } as Record<string, string>)[s] || s;
  }
  protected statusTone(s: string): 'success' | 'danger' | 'warning' {
    return s === 'active' ? 'success' : s === 'suspended' ? 'danger' : 'warning';
  }
}
