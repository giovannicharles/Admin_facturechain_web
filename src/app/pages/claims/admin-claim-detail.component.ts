import { ChangeDetectionStrategy, Component, inject, input, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatSnackBar } from '@angular/material/snack-bar';
import { AdminApi } from '@core/api/admin-api';
import { Claim, ClaimStatus } from '@core/models';
import { FcDatePipe, RelativeTimePipe } from '@shared/pipes/format.pipes';
import { ClaimStatusBadgeComponent, BadgeComponent } from '@shared/components/badges.component';

const STATUS_LABELS: Record<ClaimStatus, string> = {
  submitted: 'Soumise', received: 'Reçue', investigating: 'En analyse',
  transmitted_to_eneo: 'Transmise à ENEO', awaiting_response: 'En attente ENEO',
  resolved: 'Résolue', rejected: 'Rejetée', closed: 'Clôturée',
};

// Transitions FSM autorisées (miroir du backend)
const ALLOWED_TRANSITIONS: Record<ClaimStatus, ClaimStatus[]> = {
  submitted: ['received', 'rejected'],
  received: ['investigating', 'rejected'],
  investigating: ['transmitted_to_eneo', 'resolved', 'rejected'],
  transmitted_to_eneo: ['awaiting_response', 'resolved'],
  awaiting_response: ['resolved', 'rejected'],
  resolved: ['closed'],
  rejected: ['closed'],
  closed: [],
};

@Component({
  selector: 'fca-admin-claim-detail',
  standalone: true,
  imports: [
    CommonModule, ReactiveFormsModule, RouterLink,
    MatCardModule, MatIconModule, MatButtonModule,
    MatFormFieldModule, MatInputModule, MatSelectModule,
    MatProgressSpinnerModule, MatExpansionModule,
    FcDatePipe, RelativeTimePipe,
    ClaimStatusBadgeComponent, BadgeComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="fc-page">
      @if (loading()) {
        <div class="loader"><mat-spinner diameter="40" /></div>
      } @else {
        @if (claim(); as c) {
          <a routerLink="/claims" class="back"><mat-icon>arrow_back</mat-icon> Console réclamations</a>

          <mat-card class="header-card">
            <mat-card-content>
              <div class="head-row">
                <div>
                  <div class="num">{{ c.claimNumber }}</div>
                  <h1>{{ c.title }}</h1>
                  <div class="meta">Soumise {{ c.submittedAt | fcRelative }}</div>
                </div>
                <div class="head-right">
                  <fca-claim-status-badge [status]="c.status" />
                  @if (c.priority === 'high') { <fca-badge label="Priorité élevée" tone="danger" /> }
                </div>
              </div>
            </mat-card-content>
          </mat-card>

          <div class="grid">
            <!-- Colonne principale -->
            <div class="main-col">
              <mat-card>
                <mat-card-content>
                  <h3>Description</h3>
                  <p class="desc">{{ c.description }}</p>
                </mat-card-content>
              </mat-card>

              <!-- Action FSM -->
              <mat-card class="action-card">
                <mat-card-content>
                  <h3><mat-icon>swap_horiz</mat-icon> Action sur la réclamation</h3>

                  @if (allowedNextStatuses(c.status).length === 0) {
                    <p class="info">Cette réclamation est clôturée — aucune transition possible.</p>
                  } @else {
                    <form [formGroup]="actionForm" (ngSubmit)="applyTransition(c)">
                      <mat-form-field>
                        <mat-label>Nouveau statut</mat-label>
                        <mat-select formControlName="status">
                          @for (s of allowedNextStatuses(c.status); track s) {
                            <mat-option [value]="s">{{ statusLabel(s) }}</mat-option>
                          }
                        </mat-select>
                      </mat-form-field>

                      @if (actionForm.value.status === 'transmitted_to_eneo') {
                        <mat-form-field>
                          <mat-label>Référence transmission ENEO</mat-label>
                          <input matInput formControlName="eneoTransmissionRef" placeholder="ex: ENEO-T-2024-0142" />
                        </mat-form-field>
                      }

                      @if (actionForm.value.status === 'resolved' || actionForm.value.status === 'rejected') {
                        <mat-form-field>
                          <mat-label>Motif / Résolution</mat-label>
                          <textarea matInput rows="3" formControlName="resolution"
                            placeholder="Expliquer la décision pour l'abonné…"></textarea>
                        </mat-form-field>
                      }

                      <mat-form-field>
                        <mat-label>Note interne (optionnel)</mat-label>
                        <input matInput formControlName="note" />
                      </mat-form-field>

                      <div class="actions-row">
                        <button mat-flat-button color="primary" type="submit"
                                [disabled]="actionForm.invalid || saving()">
                          @if (saving()) {
                            <mat-spinner diameter="18" />
                          } @else {
                            <ng-container><mat-icon>check</mat-icon><span>Appliquer</span></ng-container>
                          }
                        </button>
                      </div>
                    </form>
                  }
                </mat-card-content>
              </mat-card>

              <!-- Conversation -->
              <mat-card>
                <mat-card-content>
                  <h3>Conversation ({{ c.messages.length }})</h3>
                  @if (c.messages.length === 0) {
                    <p class="empty">Aucun message.</p>
                  } @else {
                    <div class="messages">
                      @for (m of c.messages; track m._id) {
                        <div class="message" [class.me]="m.authorRole !== 'subscriber'">
                          <div class="msg-meta">
                            <strong>{{ roleLabel(m.authorRole) }}</strong>
                            <span>· {{ m.createdAt | fcRelative }}</span>
                          </div>
                          <div class="msg-body">{{ m.body }}</div>
                        </div>
                      }
                    </div>
                  }

                  <form [formGroup]="msgForm" (ngSubmit)="sendMessage()" class="msg-form">
                    <mat-form-field>
                      <mat-label>Réponse à l'abonné</mat-label>
                      <textarea matInput rows="2" formControlName="body"
                        placeholder="Apportez une précision, une demande de pièce…"></textarea>
                    </mat-form-field>
                    <button mat-flat-button color="primary" type="submit" [disabled]="msgForm.invalid || sending()">
                      @if (sending()) {
                        <mat-spinner diameter="18" />
                      } @else {
                        <ng-container><mat-icon>send</mat-icon><span>Envoyer</span></ng-container>
                      }
                    </button>
                  </form>
                </mat-card-content>
              </mat-card>
            </div>

            <!-- Sidebar -->
            <div class="side-col">
              <mat-card>
                <mat-card-content>
                  <h3>Métadonnées</h3>
                  <div class="row"><span>Type</span><strong>{{ c.type }}</strong></div>
                  <div class="row"><span>Priorité</span><strong>{{ c.priority }}</strong></div>
                  @if (c.eneoTransmissionRef) {
                    <div class="row"><span>Réf ENEO</span><code>{{ c.eneoTransmissionRef }}</code></div>
                  }
                  @if (c.slaDueAt) {
                    <div class="row"><span>SLA</span><strong>{{ c.slaDueAt | fcDate }}</strong></div>
                  }
                </mat-card-content>
              </mat-card>

              <mat-card>
                <mat-card-content>
                  <h3>Historique des statuts</h3>
                  <div class="timeline">
                    @for (evt of c.statusHistory; track $index) {
                      <div class="event">
                        <div class="dot"></div>
                        @if (!$last) { <div class="line"></div> }
                        <div class="event-body">
                          <strong>{{ statusLabel(evt.status) }}</strong>
                          @if (evt.note) { <p>{{ evt.note }}</p> }
                          <small>{{ evt.at | fcDate: true }}</small>
                        </div>
                      </div>
                    }
                  </div>
                </mat-card-content>
              </mat-card>
            </div>
          </div>
        }
      }
    </div>
  `,
  styles: [`
    .loader { display: flex; justify-content: center; padding: 64px; }
    .back { display: inline-flex; align-items: center; gap: 4px; color: var(--fc-text-secondary); font-size: 13px; margin-bottom: 12px; }
    .header-card { margin-bottom: 16px; }
    .head-row { display: flex; justify-content: space-between; align-items: flex-start; gap: 16px; flex-wrap: wrap; }
    .num { font-size: 12px; color: var(--fc-text-muted); font-weight: 700; }
    h1 { font-size: 22px; font-weight: 700; margin: 4px 0; }
    .meta { color: var(--fc-text-secondary); font-size: 13px; }
    .head-right { display: flex; flex-direction: column; gap: 6px; align-items: flex-end; }

    .grid { display: grid; grid-template-columns: 2fr 1fr; gap: 16px; }
    @media (max-width: 1000px) { .grid { grid-template-columns: 1fr; } }
    .main-col, .side-col { display: flex; flex-direction: column; gap: 16px; }

    h3 {
      margin: 0 0 12px; font-size: 13px; font-weight: 600;
      color: var(--fc-text-secondary); text-transform: uppercase; letter-spacing: 0.5px;
      display: flex; align-items: center; gap: 6px;
    }
    h3 mat-icon { font-size: 18px; height: 18px; width: 18px; color: var(--fc-primary); }
    .desc { white-space: pre-wrap; line-height: 1.6; }

    .action-card { background: var(--fc-primary-soft) !important; }
    .action-card form { display: flex; flex-direction: column; gap: 8px; }
    mat-form-field { width: 100%; }
    .actions-row { display: flex; justify-content: flex-end; padding-top: 8px; }
    .info { color: var(--fc-text-secondary); padding: 12px; background: #fff; border-radius: 8px; }

    .messages { display: flex; flex-direction: column; gap: 12px; padding: 8px 0 16px; }
    .message {
      max-width: 85%; padding: 12px 14px; border-radius: 12px;
      background: var(--fc-surface-alt); align-self: flex-start;
    }
    .message.me { align-self: flex-end; background: var(--fc-primary-soft); }
    .msg-meta { font-size: 11px; color: var(--fc-text-muted); margin-bottom: 4px; }
    .msg-meta strong { color: var(--fc-text-secondary); margin-right: 4px; }
    .msg-body { font-size: 14px; line-height: 1.5; }
    .empty { color: var(--fc-text-muted); padding: 16px 0; }

    .msg-form { display: flex; gap: 8px; align-items: flex-start; padding-top: 12px; border-top: 1px solid var(--fc-border); margin-top: 16px; }
    .msg-form mat-form-field { flex: 1; }
    .msg-form button { height: 56px; }

    .row { display: flex; justify-content: space-between; padding: 6px 0; gap: 8px; }
    .row span { color: var(--fc-text-secondary); font-size: 13px; }
    .row strong { font-size: 13px; }
    .row code { font-family: monospace; font-size: 11px; background: var(--fc-surface-alt); padding: 2px 6px; border-radius: 4px; }

    .timeline { padding: 0 0 0 4px; }
    .event { position: relative; padding: 0 0 16px 24px; }
    .dot { position: absolute; left: 0; top: 4px; width: 12px; height: 12px; border-radius: 6px; background: var(--fc-primary); }
    .line { position: absolute; left: 5px; top: 16px; bottom: 0; width: 2px; background: var(--fc-border); }
    .event-body strong { font-size: 13px; }
    .event-body p { font-size: 12px; color: var(--fc-text-secondary); margin: 4px 0; }
    .event-body small { font-size: 11px; color: var(--fc-text-muted); }
  `],
})
export class AdminClaimDetailComponent {
  readonly id = input.required<string>();

  private fb = inject(FormBuilder);
  private adminApi = inject(AdminApi);
  private snack = inject(MatSnackBar);

  protected loading = signal(true);
  protected saving = signal(false);
  protected sending = signal(false);
  protected claim = signal<Claim | null>(null);

  protected actionForm = this.fb.nonNullable.group({
    status: ['' as ClaimStatus | '', [Validators.required]],
    note: [''],
    resolution: [''],
    eneoTransmissionRef: [''],
  });

  protected msgForm = this.fb.nonNullable.group({
    body: ['', [Validators.required, Validators.minLength(1)]],
  });

  constructor() {
    queueMicrotask(() => this.load());
  }

  private load() {
    this.adminApi.claim(this.id()).subscribe({
      next: (r) => { this.claim.set(r.data.claim); this.loading.set(false); },
      error: () => this.loading.set(false),
    });
  }

  protected allowedNextStatuses(current: ClaimStatus): ClaimStatus[] {
    return ALLOWED_TRANSITIONS[current];
  }

  applyTransition(c: Claim) {
    if (this.actionForm.invalid || this.saving()) return;
    const v = this.actionForm.getRawValue();
    if (!v.status) return;
    this.saving.set(true);
    this.adminApi.setClaimStatus(c._id, v.status, v.note || undefined, v.resolution || undefined, v.eneoTransmissionRef || undefined)
      .subscribe({
        next: (r) => {
          this.claim.set(r.data.claim);
          this.actionForm.reset({ status: '' as '', note: '', resolution: '', eneoTransmissionRef: '' });
          this.saving.set(false);
          this.snack.open('Statut mis à jour', 'OK', { duration: 3000, panelClass: 'fc-snack-success' });
        },
        error: (e) => {
          this.saving.set(false);
          this.snack.open(e?.error?.error?.message || 'Échec de la transition', 'OK',
            { duration: 4000, panelClass: 'fc-snack-error' });
        },
      });
  }

  sendMessage() {
    if (this.msgForm.invalid || this.sending()) return;
    this.sending.set(true);
    this.adminApi.postClaimMessage(this.id(), this.msgForm.controls.body.value).subscribe({
      next: (r) => {
        this.claim.set(r.data.claim);
        this.msgForm.reset();
        this.sending.set(false);
      },
      error: () => this.sending.set(false),
    });
  }

  protected statusLabel(s: ClaimStatus): string { return STATUS_LABELS[s]; }
  protected roleLabel(r: string): string {
    return ({ subscriber: 'Abonné', agent: 'Agent', admin: 'Admin', system: 'Système' } as Record<string, string>)[r] || r;
  }
}
