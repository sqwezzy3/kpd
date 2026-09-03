import { Routes } from '@angular/router';
import { authGuard, guestGuard } from './core/guards/auth.guard';
import { LayoutComponent } from './layout/layout.component';

export const routes: Routes = [
  {
    path: 'login',
    canActivate: [guestGuard],
    loadComponent: () =>
      import('./core/pages/login/login.component').then((m) => m.LoginComponent),
  },
  {
    path: '',
    component: LayoutComponent,
    canActivate: [authGuard],
    children: [
      {
        path: '',
        pathMatch: 'full',
        redirectTo: 'files',
      },
      {
        path: 'files',
        loadComponent: () =>
          import('./core/pages/files/files.component').then(
            (m) => m.FilesComponent,
          ),
      },
      {
        path: 'profile',
        loadComponent: () =>
          import('./core/pages/profile/profile.component').then(
            (m) => m.ProfileComponent,
          ),
      },
    ],
  },
  {
    path: '**',
    redirectTo: 'files',
  },
];
