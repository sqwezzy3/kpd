import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { Avatar } from '@openng/optimus-ui/avatar';
import { Button } from '@openng/optimus-ui/button';
import { AuthService } from '../core/services/auth.service';

@Component({
  selector: 'app-layout',
  imports: [RouterOutlet, RouterLink, RouterLinkActive, Avatar, Button],
  templateUrl: './layout.component.html',
  styleUrl: './layout.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LayoutComponent {
  readonly authService = inject(AuthService);

  logout(): void {
    this.authService.logout();
  }
}
