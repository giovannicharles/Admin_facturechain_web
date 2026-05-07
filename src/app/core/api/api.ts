import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '@env/environment';
import {
  Anomaly, ApiOk, Claim, ClaimType, ConsumptionStats, Customer, Invoice, Meter, PowerOutage,
} from '../models';

@Injectable({ providedIn: 'root' })
export class CustomerApi {
  private http = inject(HttpClient);
  private base = environment.apiBaseUrl;

  myCustomer() { return this.http.get<ApiOk<{ customer: Customer }>>(`${this.base}/me/customer`); }
  myMeters() { return this.http.get<ApiOk<{ meters: Meter[] }>>(`${this.base}/me/meters`); }
  meter(id: string) { return this.http.get<ApiOk<{ meter: Meter }>>(`${this.base}/meters/${id}`); }
  meterInvoices(id: string, page = 1, limit = 20) {
    return this.http.get<ApiOk<Invoice[]>>(`${this.base}/meters/${id}/invoices`, { params: new HttpParams({ fromObject: { page, limit } }) });
  }
  meterAnomalies(id: string) {
    return this.http.get<ApiOk<{ anomalies: Anomaly[] }>>(`${this.base}/meters/${id}/anomalies`);
  }
  meterStats(id: string) {
    return this.http.get<ApiOk<ConsumptionStats>>(`${this.base}/meters/${id}/consumption-stats`);
  }
  submitReading(payload: { meterId: string; value: number; photoUrl?: string; notes?: string }) {
    return this.http.post<ApiOk<{ reading: unknown }>>(`${this.base}/index-readings`, payload);
  }
}

@Injectable({ providedIn: 'root' })
export class InvoiceApi {
  private http = inject(HttpClient);
  private base = environment.apiBaseUrl;

  searchByNumber(invoiceNumber: string) {
    return this.http.get<ApiOk<{ invoice: Invoice; anomalies: Anomaly[] }>>(`${this.base}/invoices/search`,
      { params: new HttpParams({ fromObject: { invoiceNumber } }) });
  }
  getById(id: string) {
    return this.http.get<ApiOk<{ invoice: Invoice; anomalies: Anomaly[] }>>(`${this.base}/invoices/${id}`);
  }
  verify(id: string) {
    return this.http.get<ApiOk<{ invoiceNumber: string; hash: string; previousHash: string | null; isValid: boolean; sealedAt: string }>>(
      `${this.base}/invoices/${id}/verify`);
  }
  pdfBlob(id: string): Observable<Blob> {
    return this.http.get(`${this.base}/invoices/${id}/pdf`, { responseType: 'blob' });
  }
}

@Injectable({ providedIn: 'root' })
export class ClaimApi {
  private http = inject(HttpClient);
  private base = environment.apiBaseUrl;

  submit(payload: {
    type: ClaimType; title: string; description: string;
    meterId?: string; invoiceId?: string; priority?: 'low' | 'medium' | 'high';
  }) {
    return this.http.post<ApiOk<{ claim: Claim }>>(`${this.base}/claims`, payload);
  }
  mine(page = 1, limit = 20) {
    return this.http.get<ApiOk<Claim[]>>(`${this.base}/claims/mine`, { params: new HttpParams({ fromObject: { page, limit } }) });
  }
  detail(id: string) { return this.http.get<ApiOk<{ claim: Claim }>>(`${this.base}/claims/${id}`); }
  postMessage(id: string, body: string) {
    return this.http.post<ApiOk<{ claim: Claim }>>(`${this.base}/claims/${id}/messages`, { body });
  }
}

@Injectable({ providedIn: 'root' })
export class OutageApi {
  private http = inject(HttpClient);
  private base = environment.apiBaseUrl;

  list(params?: { city?: string; region?: string; activeOnly?: boolean }) {
    let p = new HttpParams();
    if (params?.city) p = p.set('city', params.city);
    if (params?.region) p = p.set('region', params.region);
    if (params?.activeOnly !== undefined) p = p.set('activeOnly', String(params.activeOnly));
    return this.http.get<ApiOk<PowerOutage[]>>(`${this.base}/outages`, { params: p });
  }
  report(payload: { region: string; city: string; neighborhood?: string; startTime: string; description?: string }) {
    return this.http.post<ApiOk<{ outage: PowerOutage }>>(`${this.base}/outages`, payload);
  }
  confirm(id: string) {
    return this.http.post<ApiOk<{ outage: PowerOutage }>>(`${this.base}/outages/${id}/confirm`, {});
  }
}

@Injectable({ providedIn: 'root' })
export class PublicStatsApi {
  private http = inject(HttpClient);
  private base = environment.apiBaseUrl;

  anomaliesByZone() {
    return this.http.get<ApiOk<{ since: string; zones: { city: string; count: number }[] }>>(`${this.base}/public/stats/anomalies-by-zone`);
  }
  outagesByZone() {
    return this.http.get<ApiOk<{ since: string; zones: { city: string; region: string; count: number; confirmed: number }[] }>>(
      `${this.base}/public/stats/outages-by-zone`);
  }
}
