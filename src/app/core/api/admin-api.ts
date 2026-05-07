import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { environment } from '@env/environment';
import { ApiOk, Claim, ClaimStatus, Customer, PowerOutage, User } from '../models';

export interface AdminDashboardStats {
  users: { total: number; active: number; pending: number; suspended: number };
  customers: { total: number };
  meters: { total: number; active: number };
  invoices: { total: number; period: string };
  anomalies: { total: number; high: number; unresolved: number };
  claims: { total: number; open: number; byStatus: Record<string, number> };
  outages: { active: number; lastWeek: number };
}

export interface Announcement {
  _id: string;
  title: string;
  body: string;
  severity: 'info' | 'warning' | 'critical';
  zones?: { region?: string; city?: string }[];
  startsAt: string;
  endsAt?: string | null;
  isPublished: boolean;
  createdAt: string;
}

@Injectable({ providedIn: 'root' })
export class AdminApi {
  private http = inject(HttpClient);
  private base = environment.apiBaseUrl;

  // Dashboard
  dashboard() { return this.http.get<ApiOk<AdminDashboardStats>>(`${this.base}/admin/dashboard`); }

  // Users
  listUsers(params?: { role?: string; status?: string; search?: string; page?: number; limit?: number }) {
    let p = new HttpParams();
    if (params?.role) p = p.set('role', params.role);
    if (params?.status) p = p.set('status', params.status);
    if (params?.search) p = p.set('search', params.search);
    p = p.set('page', String(params?.page ?? 1));
    p = p.set('limit', String(params?.limit ?? 25));
    return this.http.get<ApiOk<User[]>>(`${this.base}/admin/users`, { params: p });
  }
  setUserStatus(id: string, status: 'active' | 'suspended') {
    return this.http.patch<ApiOk<{ user: User }>>(`${this.base}/admin/users/${id}/status`, { status });
  }

  // Customers
  listCustomers(search?: string, page = 1, limit = 25) {
    let p = new HttpParams().set('page', String(page)).set('limit', String(limit));
    if (search) p = p.set('search', search);
    return this.http.get<ApiOk<Customer[]>>(`${this.base}/admin/customers`, { params: p });
  }

  // Claims
  listClaims(params?: { status?: ClaimStatus; priority?: string; assignedTo?: string; page?: number; limit?: number }) {
    let p = new HttpParams();
    if (params?.status) p = p.set('status', params.status);
    if (params?.priority) p = p.set('priority', params.priority);
    if (params?.assignedTo) p = p.set('assignedTo', params.assignedTo);
    p = p.set('page', String(params?.page ?? 1));
    p = p.set('limit', String(params?.limit ?? 25));
    return this.http.get<ApiOk<Claim[]>>(`${this.base}/admin/claims`, { params: p });
  }
  claim(id: string) { return this.http.get<ApiOk<{ claim: Claim }>>(`${this.base}/admin/claims/${id}`); }
  setClaimStatus(id: string, status: ClaimStatus, note?: string, resolution?: string, eneoTransmissionRef?: string) {
    return this.http.patch<ApiOk<{ claim: Claim }>>(`${this.base}/admin/claims/${id}/status`,
      { status, note, resolution, eneoTransmissionRef });
  }
  assignClaim(id: string, agentId: string) {
    return this.http.patch<ApiOk<{ claim: Claim }>>(`${this.base}/admin/claims/${id}/assign`, { agentId });
  }
  postClaimMessage(id: string, body: string) {
    return this.http.post<ApiOk<{ claim: Claim }>>(`${this.base}/claims/${id}/messages`, { body });
  }

  // Outages
  listOutages(activeOnly?: boolean) {
    let p = new HttpParams();
    if (activeOnly !== undefined) p = p.set('activeOnly', String(activeOnly));
    return this.http.get<ApiOk<PowerOutage[]>>(`${this.base}/outages`, { params: p });
  }
  resolveOutage(id: string) {
    return this.http.post<ApiOk<{ outage: PowerOutage }>>(`${this.base}/outages/${id}/resolve`, {});
  }

  // Announcements
  listAnnouncements() {
    return this.http.get<ApiOk<Announcement[]>>(`${this.base}/admin/announcements`);
  }
  createAnnouncement(payload: Partial<Announcement>) {
    return this.http.post<ApiOk<{ announcement: Announcement }>>(`${this.base}/admin/announcements`, payload);
  }
  updateAnnouncement(id: string, payload: Partial<Announcement>) {
    return this.http.patch<ApiOk<{ announcement: Announcement }>>(`${this.base}/admin/announcements/${id}`, payload);
  }
}
