import { Pipe, PipeTransform } from '@angular/core';

@Pipe({ name: 'fcFcfa', standalone: true })
export class FcfaPipe implements PipeTransform {
  transform(v: number | null | undefined): string {
    if (v === null || v === undefined || isNaN(v)) return '— FCFA';
    return `${Math.round(v).toLocaleString('fr-FR')} FCFA`;
  }
}

@Pipe({ name: 'fcKwh', standalone: true })
export class KwhPipe implements PipeTransform {
  transform(v: number | null | undefined): string {
    if (v === null || v === undefined || isNaN(v)) return '— kWh';
    return `${Math.round(v).toLocaleString('fr-FR')} kWh`;
  }
}

@Pipe({ name: 'fcDate', standalone: true })
export class FcDatePipe implements PipeTransform {
  transform(input: string | Date | null | undefined, withTime = false): string {
    if (!input) return '—';
    const d = typeof input === 'string' ? new Date(input) : input;
    if (isNaN(d.getTime())) return '—';
    const opts: Intl.DateTimeFormatOptions = withTime
      ? { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }
      : { day: '2-digit', month: 'short', year: 'numeric' };
    return d.toLocaleDateString('fr-FR', opts);
  }
}

@Pipe({ name: 'fcPeriod', standalone: true })
export class PeriodPipe implements PipeTransform {
  transform(p: { year: number; month: number } | null | undefined): string {
    if (!p) return '—';
    const months = ['janv.', 'févr.', 'mars', 'avril', 'mai', 'juin', 'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.'];
    return `${months[p.month - 1]} ${p.year}`;
  }
}

@Pipe({ name: 'fcRelative', standalone: true })
export class RelativeTimePipe implements PipeTransform {
  transform(input: string | Date | null | undefined): string {
    if (!input) return '—';
    const d = typeof input === 'string' ? new Date(input) : input;
    const diff = Date.now() - d.getTime();
    const sec = Math.floor(diff / 1000);
    if (sec < 60) return 'à l\'instant';
    const min = Math.floor(sec / 60);
    if (min < 60) return `il y a ${min} min`;
    const h = Math.floor(min / 60);
    if (h < 24) return `il y a ${h} h`;
    const days = Math.floor(h / 24);
    if (days < 7) return `il y a ${days} j`;
    return d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' });
  }
}
