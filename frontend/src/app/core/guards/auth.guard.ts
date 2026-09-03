import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { map } from 'rxjs';
import { AuthService } from '../services/auth.service';
import { TokenStorageService } from '../services/token-storage.service';

export const authGuard: CanActivateFn = (_route, state) => {
  const auth = inject(AuthService);
  const tokens = inject(TokenStorageService);
  const router = inject(Router);

  if (!tokens.getAccessToken()) {
    return router.createUrlTree(['/login'], {
      queryParams: { redirectTo: state.url },
    });
  }

  if (auth.user()) {
    return true;
  }

  return auth.loadCurrentUser().pipe(
    map((user) =>
      user
        ? true
        : router.createUrlTree(['/login'], {
            queryParams: { redirectTo: state.url },
          }),
    ),
  );
};

export const guestGuard: CanActivateFn = () => {
  const tokens = inject(TokenStorageService);
  const router = inject(Router);

  if (tokens.getAccessToken()) {
    return router.createUrlTree(['/profile']);
  }

  return true;
};
