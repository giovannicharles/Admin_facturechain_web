import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatDialog, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { AdminApi, Announcement } from '@core/api/admin-api';
import { FcDatePipe, RelativeTimePipe } from '@shared/pipes/format.pipes';
import { BadgeComponent } from '@shared/components/badges.component';

// =========== Dialog création annonce ===========
@Component({
  selector: 'fca-announcement-dialog',
  standalone: true,
  imports: [
    CommonModule, ReactiveFormsModule, MatDialogModule,
    MatFormFieldModule, MatInputModule, MatSelectModule,
    MatButtonModule, MatIconModule, MatProgressSpinnerModule,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <h2 mat-dialog-title>Nouvelle annonce</h2>
    <mat-dialog-content>
      <form [formGroup]="form" class="form">
        <mat-form-field>
          <mat-label>Titre</mat-label>
          <input matInput formControlName="title" />
        </mat-form-field>
        <mat-form-field>
          <mat-label>Message</mat-label>
          <textarea matInput rows="5" formControlName="body"></textarea>
        </mat-form-field>
        <mat-form-field>
          <mat-label>Sévérité</mat-label>
          <mat-select formControlName="severity">
            <mat-option value="info">Information</mat-option>
            <mat-option value="warning">Avertissement</mat-option>
            <mat-option value="critical">Critique</mat-option>
          </mat-select>
        </mat-form-field>
      </form>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button (click)="ref.close()">Annuler</button>
      <button mat-flat-button color="primary" (click)="submit()" [disabled]="form.invalid || loading()">
        @if (loading()) { <mat-spinner diameter="18" /> } @else { Publier }
      </button>
    </mat-dialog-actions>
  `,
  styles: [`.form { display: flex; flex-direction: column; gap: 8px; min-width: 360px; }
    mat-form-field { width: 100%; }`],
})
export class AnnouncementDialogComponent {
  protected ref = inject(MatDialogRef<AnnouncementDialogComponent>);
  private fb = inject(FormBuilder);
  private adminApi = inject(AdminApi);
  private snack = inject(MatSnackBar);

  protected loading = signal(false);
  protected form = this.fb.nonNullable.group({
    title: ['', [Validators.required, Validators.minLength(3)]],
    body: ['', [Validators.required, Validators.minLength(10)]],
    severity: ['info' as 'info' | 'warning' | 'critical', [Validators.required]],
  });

  submit() {
    if (this.form.invalid || this.loading()) return;
    this.loading.set(true);
    const v = this.form.getRawValue();
    this.adminApi.createAnnouncement({
      title: v.title, body: v.body, severity: v.severity,
      startsAt: new Date().toISOString(), isPublished: true,
    }).subscribe({
      next: (r) => {
        this.snack.open('Annonce publiée', 'OK', { duration: 3000, panelClass: 'fc-snack-success' });
        this.ref.close(r.data.announcement);
      },
      error: (e) => {
        this.loading.set(false);
        this.snack.open(e?.error?.error?.message || 'Échec', 'OK', { duration: 3000, panelClass: 'fc-snack-error' });
      },
    });
  }
}

// =========== Liste des annonces ===========
@Component({
  selector: 'fca-admin-announcements',
  standalone: true,
  imports: [
    CommonModule, MatCardModule, MatIconModule, MatButtonModule,
    MatProgressSpinnerModule, FcDatePipe, RelativeTimePipe, BadgeComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="fc-page">
      <div class="head">
        <div>
          <h1>Annonces</h1>
          <p>Communications publiques visibles dans les apps abonnés.</p>
        </div>
        <button mat-flat-button color="primary" (click)="openCreate()">
          <mat-icon>add</mat-icon> Nouvelle annonce
        </button>
      </div>

      @if (loading()) {
        <div class="loader"><mat-spinner diameter="40" /></div>
      } @else if (announcements().length === 0) {
        <mat-card><mat-card-content>
          <div class="empty">
            <mat-icon>campaign</mat-icon>
            <p>Aucune annonce publiée</p>
          </div>
        </mat-card-content></mat-card>
      } @else {
        <div class="list">
          @for (a of announcements(); track a._id) {
            <mat-card [class.critical]="a.severity === 'critical'" [class.warning-card]="a.severity === 'warning'">
              <mat-card-content>
                <div class="row">
                  <div class="severity-dot" [class.warn]="a.severity === 'warning'" [class.crit]="a.severity === 'critical'">
                    <mat-icon>{{ severityIcon(a.severity) }}</mat-icon>
                  </div>
                  <div class="body">
                    <div class="head-row">
                      <strong>{{ a.title }}</strong>
                      <fca-badge [label]="severityLabel(a.severity)" [tone]="severityTone(a.severity)" />
                    </div>
                    <p>{{ a.body }}</p>
                    <div class="meta">
                      Publié {{ a.createdAt | fcRelative }} ·
                      @if (a.isPublished) { <span class="ok">Visible</span> } @else { <span class="off">Brouillon</span> }
                    </div>
                  </div>
                </div>
              </mat-card-content>
            </mat-card>
          }
        </div>
      }
    </div>
  `,
  styles: [`
    .head { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 16px; gap: 16px; flex-wrap: wrap; }
    .head h1 { font-size: 24px; font-weight: 700; margin: 0; }
    .head p { color: var(--fc-text-secondary); margin: 4px 0 0; font-size: 13px; }
    .loader { display: flex; justify-content: center; padding: 64px; }
    .empty { text-align: center; padding: 48px; color: var(--fc-text-muted); }
    .empty mat-icon { font-size: 48px; height: 48px; width: 48px; }
    .empty p { font-weight: 600; margin: 12px 0; }
    .list { display: flex; flex-direction: column; gap: 12px; }
    .critical { border-left: 4px solid var(--fc-danger); }
    .warning-card { border-left: 4px solid var(--fc-warning); }
    .row { display: flex; gap: 16px; align-items: flex-start; }
    .severity-dot {
      width: 40px; height: 40px; border-radius: 10px; flex-shrink: 0;
      background: var(--fc-info-soft); color: var(--fc-info);
      display: flex; align-items: center; justify-content: center;
    }
    .severity-dot.warn { background: var(--fc-warning-soft); color: var(--fc-warning); }
    .severity-dot.crit { background: var(--fc-danger-soft); color: var(--fc-danger); }
    .body { flex: 1; }
    .head-row { display: flex; justify-content: space-between; align-items: center; gap: 8px; }
    .body strong { font-size: 15px; }
    .body p { color: var(--fc-text-secondary); margin: 6px 0; line-height: 1.5; font-size: 14px; }
    .meta { font-size: 11px; color: var(--fc-text-muted); }
    .meta .ok { color: var(--fc-secondary); font-weight: 600; }
    .meta .off { color: var(--fc-text-muted); }
  `],
})
export class AdminAnnouncementsComponent {
  private adminApi = inject(AdminApi);
  private dialog = inject(MatDialog);

  protected loading = signal(true);
  protected announcements = signal<Announcement[]>([]);

  constructor() { this.load(); }

  private load() {
    this.adminApi.listAnnouncements().subscribe({
      next: (r) => { this.announcements.set(r.data); this.loading.set(false); },
      error: () => this.loading.set(false),
    });
  }

  protected openCreate() {
    const ref = this.dialog.open(AnnouncementDialogComponent, { width: '520px' });
    ref.afterClosed().subscribe((created) => { if (created) this.load(); });
  }

  protected severityIcon(s: string): string {
    return ({ info: 'info', warning: 'warning', critical: 'crisis_alert' } as Record<string, string>)[s] || 'info';
  }
  protected severityLabel(s: string): string {
    return ({ info: 'Information', warning: 'Avertissement', critical: 'Critique' } as Record<string, string>)[s] || s;
  }
  protected severityTone(s: string): 'info' | 'warning' | 'danger' {
    return s === 'critical' ? 'danger' : s === 'warning' ? 'warning' : 'info';
  }
}
