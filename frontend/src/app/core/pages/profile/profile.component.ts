import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  inject,
  signal,
} from '@angular/core';
import { DatePipe } from '@angular/common';
import { Button } from '@openng/optimus-ui/button';
import { Card } from '@openng/optimus-ui/card';
import { Avatar } from '@openng/optimus-ui/avatar';
import { Tag } from '@openng/optimus-ui/tag';
import { MessageService } from '@openng/optimus-ui/api';
import { AuthService } from '../../services/auth.service';
import type { User } from '../../models/auth.model';

@Component({
  selector: 'app-profile',
  imports: [DatePipe, Button, Card, Avatar, Tag],
  templateUrl: './profile.component.html',
  styleUrl: './profile.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProfileComponent implements OnInit {
  private readonly authService = inject(AuthService);
  private readonly messageService = inject(MessageService);

  readonly loading = signal(true);
  readonly user = this.authService.user;

  ngOnInit(): void {
    if (this.user()) {
      this.loading.set(false);
      return;
    }

    this.authService.loadCurrentUser().subscribe({
      next: () => this.loading.set(false),
      error: () => this.loading.set(false),
    });
  }

  logout(): void {
    this.messageService.add({
      severity: 'info',
      summary: 'Выход',
      detail: 'Сессия завершена',
    });
    this.authService.logout();
  }

  initials(user: User): string {
    return user.name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase() ?? '')
      .join('');
  }
}
