import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ClaimStatus, Severity } from '@core/models';

// =============== Badge générique ===============
type BadgeTone = 'default' | 'primary' | 'success' | 'warning' | 'danger' | 'info';

@Component({
  selector: 'fca-badge',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<span class="fc-badge --{{tone}}">{{ label }}</span>`,
})
export class BadgeComponent {
  @Input({ required: true }) label!: string;
  @Input() tone: BadgeTone = 'default';
}

// =============== ClaimStatusBadge ===============
@Component({
  selector: 'fca-claim-status-badge',
  standalone: true,
  imports: [BadgeComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<fca-badge [label]="label" [tone]="tone" />`,
})
export class ClaimStatusBadgeComponent {
  @Input({ required: true }) status!: ClaimStatus;

  protected get label(): string {
    return ({
      submitted: 'Soumise', received: 'Reçue', investigating: 'En analyse',
      transmitted_to_eneo: 'Transmise ENEO', awaiting_response: 'En attente ENEO',
      resolved: 'Résolue', rejected: 'Rejetée', closed: 'Clôturée',
    } as const)[this.status];
  }
  protected get tone(): BadgeTone {
    return ({
      submitted: 'info', received: 'primary', investigating: 'warning',
      transmitted_to_eneo: 'primary', awaiting_response: 'warning',
      resolved: 'success', rejected: 'danger', closed: 'default',
    } as const)[this.status];
  }
}

// =============== InvoiceStatusBadge ===============
@Component({
  selector: 'fca-invoice-status-badge',
  standalone: true,
  imports: [BadgeComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<fca-badge [label]="label" [tone]="tone" />`,
})
export class InvoiceStatusBadgeComponent {
  @Input({ required: true }) status!: 'pending' | 'paid' | 'overdue' | 'disputed' | 'cancelled';

  protected get label(): string {
    return ({
      pending: 'À payer', paid: 'Payée', overdue: 'En retard',
      disputed: 'Contestée', cancelled: 'Annulée',
    } as const)[this.status];
  }
  protected get tone(): BadgeTone {
    return ({
      pending: 'warning', paid: 'success', overdue: 'danger',
      disputed: 'info', cancelled: 'default',
    } as const)[this.status];
  }
}

// =============== SeverityBadge ===============
@Component({
  selector: 'fca-severity-badge',
  standalone: true,
  imports: [BadgeComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<fca-badge [label]="label" [tone]="tone" />`,
})
export class SeverityBadgeComponent {
  @Input({ required: true }) severity!: Severity;

  protected get label() { return ({ low: 'Faible', medium: 'Moyenne', high: 'Élevée' } as const)[this.severity]; }
  protected get tone(): BadgeTone {
    return ({ low: 'default', medium: 'warning', high: 'danger' } as const)[this.severity];
  }
}
