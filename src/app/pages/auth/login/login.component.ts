import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { AuthService } from '@core/auth/auth.service';

@Component({
  selector: 'fca-admin-login',
  standalone: true,
  imports: [
    CommonModule, ReactiveFormsModule,
    MatCardModule, MatFormFieldModule, MatInputModule,
    MatButtonModule, MatIconModule, MatProgressSpinnerModule,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="shell">
      <div class="card">
        <div class="brand">
          <div class="logo">FCA</div>
          <div>
            <div class="title">FactureChain</div>
            <div class="subtitle">Console d'administration</div>
          </div>
        </div>

        <h2>Connexion</h2>
        <p class="lead">Réservé aux administrateurs et agents de support.</p>

        <form [formGroup]="form" (ngSubmit)="submit()">
          <mat-form-field>
            <mat-label>Adresse email</mat-label>
            <input matInput type="email" formControlName="email" autocomplete="email" />
            <mat-icon matSuffix>mail</mat-icon>
          </mat-form-field>
          <mat-form-field>
            <mat-label>Mot de passe</mat-label>
            <input matInput [type]="showPassword() ? 'text' : 'password'" formControlName="password" autocomplete="current-password" />
            <button mat-icon-button matSuffix type="button" (click)="showPassword.set(!showPassword())">
              <mat-icon>{{ showPassword() ? 'visibility_off' : 'visibility' }}</mat-icon>
            </button>
          </mat-form-field>

          @if (error()) {
            <div class="error">{{ error() }}</div>
          }

          <button mat-flat-button color="primary" class="submit"
                  type="submit" [disabled]="form.invalid || loading()">
            @if (loading()) {
              <mat-spinner diameter="20" class="inline-spinner" />
            } @else {
              Se connecter
            }
          </button>
        </form>

        <div class="demo">
          <div class="demo-title">Comptes administrateurs</div>
          <div class="demo-row">
            <span>Admin</span>
            <code>admin&#64;facturechain.cm</code>
            <code>Admin&#64;2024</code>
          </div>
          <div class="demo-row">
            <span>Agent</span>
            <code>agent&#64;facturechain.cm</code>
            <code>Agent&#64;2024</code>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .shell {
      min-height: 100vh; display: flex; align-items: center; justify-content: center;
      background: linear-gradient(135deg, #0F172A 0%, #0846C2 100%);
      padding: 32px;
    }
    .card {
      width: 100%; max-width: 440px;
      background: #fff; border-radius: 20px; padding: 36px 32px;
      box-shadow: 0 30px 80px rgba(0,0,0,0.3);
    }
    .brand { display: flex; align-items: center; gap: 12px; margin-bottom: 24px; }
    .logo {
      width: 50px; height: 50px; border-radius: 14px;
      background: var(--fc-primary); color: #fff;
      display: flex; align-items: center; justify-content: center;
      font-size: 16px; font-weight: 700;
    }
    .title { font-size: 18px; font-weight: 700; color: var(--fc-text); }
    .subtitle { font-size: 12px; color: var(--fc-text-muted); text-transform: uppercase; letter-spacing: 0.5px; }
    h2 { margin: 0; font-size: 22px; font-weight: 700; }
    .lead { color: var(--fc-text-secondary); margin: 4px 0 24px; font-size: 14px; }
    form { display: flex; flex-direction: column; gap: 8px; }
    mat-form-field { width: 100%; }
    .error { background: var(--fc-danger-soft); color: #B91C1C; padding: 10px 12px; border-radius: 8px; font-size: 13px; margin: 4px 0; }
    .submit { margin-top: 12px; height: 48px; font-weight: 600; }
    .inline-spinner ::ng-deep circle { stroke: #fff; }
    .demo { margin-top: 24px; padding: 14px; background: var(--fc-surface-alt); border-radius: 10px; font-size: 12px; }
    .demo-title { font-weight: 600; color: var(--fc-text-secondary); margin-bottom: 8px; }
    .demo-row { display: flex; gap: 8px; align-items: center; flex-wrap: wrap; padding: 4px 0; }
    .demo-row span { font-weight: 600; min-width: 50px; color: var(--fc-text); }
    .demo-row code { background: #fff; padding: 2px 6px; border-radius: 4px; font-family: monospace; font-size: 11px; }
  `],
})
export class AdminLoginComponent {
  private fb = inject(FormBuilder);
  private auth = inject(AuthService);
  private router = inject(Router);

  protected loading = signal(false);
  protected error = signal<string | null>(null);
  protected showPassword = signal(false);

  protected form = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(8)]],
  });

  submit() {
    if (this.form.invalid || this.loading()) return;
    const { email, password } = this.form.getRawValue();
    this.loading.set(true);
    this.error.set(null);

    this.auth.login(email, password).subscribe({
      next: (r) => {
        const role = r.data.user.role;
        if (role !== 'admin' && role !== 'agent') {
          this.auth.clearTokens();
          this.auth.user.set(null);
          this.loading.set(false);
          this.error.set('Compte non autorisé pour la console admin.');
          return;
        }
        this.auth.fetchMe().subscribe({
          next: () => { this.loading.set(false); this.router.navigateByUrl('/dashboard'); },
          error: () => { this.loading.set(false); this.router.navigateByUrl('/dashboard'); },
        });
      },
      error: (e) => {
        this.loading.set(false);
        this.error.set(e?.error?.error?.message || 'Email ou mot de passe incorrect.');
      },
    });
  }
}
