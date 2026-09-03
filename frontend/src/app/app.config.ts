import {
  ApplicationConfig,
  provideBrowserGlobalErrorListeners,
} from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { provideOptimus } from '@openng/optimus-ui/config';
import { MessageService } from '@openng/optimus-ui/api';
import { routes } from './app.routes';
import { THEME_CONFIGURATION } from './shared/theme/configuration';
import { authInterceptor } from './core/interceptors/auth.interceptor';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes),
    provideHttpClient(withInterceptors([authInterceptor])),
    provideOptimus(THEME_CONFIGURATION),
    MessageService,
  ],
};
