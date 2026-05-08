import { Routes } from '@angular/router';
import { AdminPortalComponent } from './pages/admin-portal/admin-portal.component';
import { CustomerPortalComponent } from './pages/customer-portal/customer-portal.component';
import { LandingComponent } from './pages/landing/landing.component';
import { LoginComponent } from './pages/login/login.component';
import { NotFoundComponent } from './pages/not-found/not-found.component';
import { RegisterComponent } from './pages/register/register.component';
import { StaffPortalComponent } from './pages/staff-portal/staff-portal.component';

export const routes: Routes = [
  { path: '', component: LandingComponent, title: 'HM | Home' },
  { path: 'welcome', redirectTo: '', pathMatch: 'full' },
  { path: 'register', component: RegisterComponent, title: 'HM | Register' },
  { path: 'login', component: LoginComponent, title: 'HM | Login' },
  { path: 'customer', component: CustomerPortalComponent, title: 'HM | Customer Portal' },
  { path: 'admin', component: AdminPortalComponent, title: 'HM | Admin Portal' },
  { path: 'staff', component: StaffPortalComponent, title: 'HM | Staff Portal' },
  { path: '**', component: NotFoundComponent, title: 'HM | Not Found' }
];
