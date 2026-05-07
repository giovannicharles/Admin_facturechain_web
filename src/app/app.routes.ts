import { Routes } from '@angular/router';
import { authGuard, guestGuard } from '@core/guards/auth.guard';
import { adminRoleGuard } from '@core/guards/admin-role.guard';

export const routes: Routes = [
  {
    path: 'auth',
    canActivate: [guestGuard],
    children: [
      { path: 'login', loadComponent: () => import('./pages/auth/login/login.component').then((m) => m.AdminLoginComponent) },
      { path: '', pathMatch: 'full', redirectTo: 'login' },
    ],
  },
  {
    path: '',
    canActivate: [authGuard, adminRoleGuard],
    loadComponent: () => import('./shared/layouts/main-layout.component').then((m) => m.MainLayoutComponent),
    children: [
      { path: 'dashboard',     loadComponent: () => import('./pages/dashboard/admin-dashboard.component').then((m) => m.AdminDashboardComponent) },
      { path: 'claims',        loadComponent: () => import('./pages/claims/admin-claims-list.component').then((m) => m.AdminClaimsListComponent) },
      { path: 'claims/:id',    loadComponent: () => import('./pages/claims/admin-claim-detail.component').then((m) => m.AdminClaimDetailComponent) },
      { path: 'users',         loadComponent: () => import('./pages/users/admin-users.component').then((m) => m.AdminUsersComponent) },
      { path: 'customers',     loadComponent: () => import('./pages/customers/admin-customers.component').then((m) => m.AdminCustomersComponent) },
      { path: 'outages',       loadComponent: () => import('./pages/outages/admin-outages.component').then((m) => m.AdminOutagesComponent) },
      { path: 'announcements', loadComponent: () => import('./pages/announcements/admin-announcements.component').then((m) => m.AdminAnnouncementsComponent) },
      { path: '', pathMatch: 'full', redirectTo: 'dashboard' },
    ],
  },
  { path: '**', redirectTo: 'dashboard' },
];
