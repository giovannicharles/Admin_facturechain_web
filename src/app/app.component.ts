import { ChangeDetectionStrategy, Component, OnInit, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { AuthService } from '@core/auth/auth.service';

@Component({
  selector: 'fca-root',
  standalone: true,
  imports: [RouterOutlet, MatProgressSpinnerModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (auth.isBootstrapping()) {
      <div class="boot-screen">
        <div class="boot-card">
          <div class="boot-logo">FC</div>
          <h1>FactureChain</h1>
          <mat-spinner diameter="36" />
        </div>
      </div>
    } @else {
      <router-outlet />
    }
  `,
  styles: [`
    :host { display: block; height: 100%; }
    .boot-screen {
      height: 100vh; display: flex; align-items: center; justify-content: center;
      background: linear-gradient(135deg, var(--fc-primary), var(--fc-primary-dark));
    }
    .boot-card { display: flex; flex-direction: column; align-items: center; gap: 16px; color: #fff; }
    .boot-logo {
      width: 76px; height: 76px; border-radius: 22px;
      background: rgba(255, 255, 255, 0.18);
      display: flex; align-items: center; justify-content: center;
      font-size: 30px; font-weight: 700;
    }
    h1 { margin: 0; font-size: 22px; font-weight: 700; }
  `],
})
export class AppComponent implements OnInit {
  protected auth = inject(AuthService);

  ngOnInit() { this.auth.bootstrap(); }
}
