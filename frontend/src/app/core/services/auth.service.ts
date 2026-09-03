import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { tap, catchError, of, Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import type { AuthResponse, User } from '../models/auth.model';
import { TokenStorageService } from './token-storage.service';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly tokens = inject(TokenStorageService);
  private readonly router = inject(Router);

  readonly user = signal<User | null>(null);
  readonly isAuthenticated = signal(!!this.tokens.getAccessToken());

  login(email: string, password: string): Observable<AuthResponse> {
    return this.http
      .post<AuthResponse>(`${environment.apiUrl}/auth/login`, { email, password })
      .pipe(tap((response) => this.applyAuth(response)));
  }

  register(email: string, password: string, name: string): Observable<AuthResponse> {
    return this.http
      .post<AuthResponse>(`${environment.apiUrl}/auth/register`, {
        email,
        password,
        name,
      })
      .pipe(tap((response) => this.applyAuth(response)));
  }

  loadCurrentUser(): Observable<User | null> {
    if (!this.tokens.getAccessToken()) {
      this.isAuthenticated.set(false);
      this.user.set(null);
      return of(null);
    }

    return this.http.get<User>(`${environment.apiUrl}/users/me`).pipe(
      tap((user) => {
        this.user.set(user);
        this.isAuthenticated.set(true);
      }),
      catchError(() => {
        this.logout(false);
        return of(null);
      }),
    );
  }

  logout(navigate = true): void {
    this.tokens.clear();
    this.user.set(null);
    this.isAuthenticated.set(false);
    if (navigate) {
      void this.router.navigate(['/login']);
    }
  }

  private applyAuth(response: AuthResponse): void {
    this.tokens.setAccessToken(response.accessToken);
    this.user.set(response.user);
    this.isAuthenticated.set(true);
  }
}
