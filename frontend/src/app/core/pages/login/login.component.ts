import {
  ChangeDetectionStrategy,
  Component,
  HostListener,
  inject,
  signal,
} from '@angular/core';
import {
  FormBuilder,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { Button } from '@openng/optimus-ui/button';
import { InputText } from '@openng/optimus-ui/inputtext';
import { FloatLabel } from '@openng/optimus-ui/floatlabel';
import { PasswordModule } from '@openng/optimus-ui/password';
import { Message } from '@openng/optimus-ui/message';
import { MessageService } from '@openng/optimus-ui/api';
import { AuthService } from '../../services/auth.service';
import { extractApiErrorMessage } from '../../utils/api-error';

type AuthMode = 'login' | 'register';

@Component({
  selector: 'app-login',
  imports: [
    ReactiveFormsModule,
    Button,
    InputText,
    FloatLabel,
    PasswordModule,
    Message,
  ],
  templateUrl: './login.component.html',
  styleUrl: './login.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LoginComponent {
  private readonly formBuilder = inject(FormBuilder);
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly messageService = inject(MessageService);

  readonly mode = signal<AuthMode>('login');
  readonly loading = signal(false);
  readonly sharedError = signal('');

  readonly form = this.formBuilder.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(8)]],
    name: [''],
  });

  get isRegister(): boolean {
    return this.mode() === 'register';
  }

  switchMode(mode: AuthMode): void {
    this.mode.set(mode);
    this.sharedError.set('');
    this.form.controls.name.setValidators(
      mode === 'register'
        ? [Validators.required, Validators.minLength(2)]
        : [],
    );
    this.form.controls.name.updateValueAndValidity();
  }

  submit(): void {
    this.sharedError.set('');
    this.form.markAllAsTouched();

    if (this.form.invalid) {
      return;
    }

    const { email, password, name } = this.form.getRawValue();
    this.loading.set(true);

    const request$ =
      this.mode() === 'login'
        ? this.authService.login(email, password)
        : this.authService.register(email, password, name);

    request$.subscribe({
      next: () => {
        this.loading.set(false);
        this.messageService.add({
          severity: 'success',
          summary: 'Успех',
          detail:
            this.mode() === 'login'
              ? 'Вы успешно вошли'
              : 'Аккаунт создан',
        });
        const redirectTo =
          this.route.snapshot.queryParamMap.get('redirectTo') || '/profile';
        void this.router.navigateByUrl(redirectTo);
      },
      error: (error) => {
        this.loading.set(false);
        this.sharedError.set(extractApiErrorMessage(error));
      },
    });
  }

  @HostListener('document:keyup.enter')
  onEnter(): void {
    this.submit();
  }
}
