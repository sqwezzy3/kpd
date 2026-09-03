import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  inject,
  signal,
} from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Button } from '@openng/optimus-ui/button';
import { Card } from '@openng/optimus-ui/card';
import { TableModule } from '@openng/optimus-ui/table';
import { ProgressBar } from '@openng/optimus-ui/progressbar';
import { Dialog } from '@openng/optimus-ui/dialog';
import { InputText } from '@openng/optimus-ui/inputtext';
import { Tag } from '@openng/optimus-ui/tag';
import { MessageService } from '@openng/optimus-ui/api';
import { FilesApiService } from '../../services/files-api.service';
import type { StoredFile, UploadProgressItem } from '../../models/file.model';
import { extractApiErrorMessage } from '../../utils/api-error';
import { formatBytes } from '../../utils/format-bytes';

const MAX_FILE_SIZE = 1024 * 1024 * 1024;

@Component({
  selector: 'app-files',
  imports: [
    DatePipe,
    FormsModule,
    Button,
    Card,
    TableModule,
    ProgressBar,
    Dialog,
    InputText,
    Tag,
  ],
  templateUrl: './files.component.html',
  styleUrl: './files.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FilesComponent implements OnInit {
  private readonly filesApi = inject(FilesApiService);
  private readonly messageService = inject(MessageService);

  readonly loading = signal(true);
  readonly files = signal<StoredFile[]>([]);
  readonly uploads = signal<UploadProgressItem[]>([]);
  readonly busyIds = signal<Set<string>>(new Set());

  readonly renameVisible = signal(false);
  readonly renameName = signal('');
  readonly renameTarget = signal<StoredFile | null>(null);

  readonly deleteVisible = signal(false);
  readonly deleteTarget = signal<StoredFile | null>(null);

  readonly formatBytes = formatBytes;

  ngOnInit(): void {
    this.reload();
  }

  reload(): void {
    this.loading.set(true);
    this.filesApi.list().subscribe({
      next: (items) => {
        this.files.set(items);
        this.loading.set(false);
      },
      error: (error) => {
        this.loading.set(false);
        this.messageService.add({
          severity: 'error',
          summary: 'Ошибка',
          detail: extractApiErrorMessage(error, 'Не удалось загрузить список'),
        });
      },
    });
  }

  onFileInputChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    const selected = Array.from(input.files ?? []);
    input.value = '';
    if (!selected.length) {
      return;
    }
    for (const file of selected) {
      void this.startUpload(file);
    }
  }

  async startUpload(file: File): Promise<void> {
    if (file.size <= 0) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Пустой файл',
        detail: `Файл «${file.name}» пустой`,
      });
      return;
    }

    if (file.size > MAX_FILE_SIZE) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Слишком большой файл',
        detail: `«${file.name}» превышает 1 ГБ`,
      });
      return;
    }

    const uploadId = crypto.randomUUID();
    this.uploads.update((items) => [
      {
        id: uploadId,
        fileName: file.name,
        progress: 0,
        status: 'uploading',
      },
      ...items,
    ]);

    try {
      const stored = await this.filesApi.uploadFile(file, (progress) => {
        this.patchUpload(uploadId, {
          progress,
          status: progress >= 99 ? 'completing' : 'uploading',
        });
      });

      this.patchUpload(uploadId, { progress: 100, status: 'done' });
      this.files.update((items) => [stored, ...items.filter((f) => f.id !== stored.id)]);
      this.messageService.add({
        severity: 'success',
        summary: 'Загружено',
        detail: `Файл «${stored.originalName}» сохранён`,
      });

      window.setTimeout(() => {
        this.uploads.update((items) => items.filter((item) => item.id !== uploadId));
      }, 1800);
    } catch (error) {
      this.patchUpload(uploadId, {
        status: 'error',
        error: extractApiErrorMessage(error, 'Ошибка загрузки'),
      });
      this.messageService.add({
        severity: 'error',
        summary: 'Ошибка загрузки',
        detail: extractApiErrorMessage(error),
      });
    }
  }

  openRename(file: StoredFile): void {
    this.renameTarget.set(file);
    this.renameName.set(file.originalName);
    this.renameVisible.set(true);
  }

  confirmRename(): void {
    const file = this.renameTarget();
    const name = this.renameName().trim();
    if (!file || !name) {
      return;
    }

    this.setBusy(file.id, true);
    this.filesApi.rename(file.id, name).subscribe({
      next: (updated) => {
        this.files.update((items) =>
          items.map((item) => (item.id === updated.id ? updated : item)),
        );
        this.renameVisible.set(false);
        this.setBusy(file.id, false);
        this.messageService.add({
          severity: 'success',
          summary: 'Переименовано',
          detail: `Новое имя: ${updated.originalName}`,
        });
      },
      error: (error) => {
        this.setBusy(file.id, false);
        this.messageService.add({
          severity: 'error',
          summary: 'Ошибка',
          detail: extractApiErrorMessage(error),
        });
      },
    });
  }

  openDelete(file: StoredFile): void {
    this.deleteTarget.set(file);
    this.deleteVisible.set(true);
  }

  confirmDelete(): void {
    const file = this.deleteTarget();
    if (!file) {
      return;
    }

    this.setBusy(file.id, true);
    this.filesApi.remove(file.id).subscribe({
      next: () => {
        this.files.update((items) => items.filter((item) => item.id !== file.id));
        this.deleteVisible.set(false);
        this.setBusy(file.id, false);
        this.messageService.add({
          severity: 'success',
          summary: 'Удалено',
          detail: `Файл «${file.originalName}» удалён`,
        });
      },
      error: (error) => {
        this.setBusy(file.id, false);
        this.messageService.add({
          severity: 'error',
          summary: 'Ошибка',
          detail: extractApiErrorMessage(error),
        });
      },
    });
  }

  download(file: StoredFile): void {
    this.setBusy(file.id, true);
    this.filesApi.downloadBlob(file.id).subscribe({
      next: (blob) => {
        this.triggerBrowserDownload(blob, file.originalName);
        this.setBusy(file.id, false);
      },
      error: (error) => {
        this.setBusy(file.id, false);
        this.messageService.add({
          severity: 'error',
          summary: 'Ошибка',
          detail: extractApiErrorMessage(error, 'Не удалось скачать файл'),
        });
      },
    });
  }

  view(file: StoredFile): void {
    this.setBusy(file.id, true);
    this.filesApi.viewBlob(file.id).subscribe({
      next: (blob) => {
        const url = URL.createObjectURL(blob);
        window.open(url, '_blank', 'noopener,noreferrer');
        window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
        this.setBusy(file.id, false);
      },
      error: (error) => {
        this.setBusy(file.id, false);
        this.messageService.add({
          severity: 'error',
          summary: 'Ошибка',
          detail: extractApiErrorMessage(error, 'Не удалось открыть файл'),
        });
      },
    });
  }

  isBusy(fileId: string): boolean {
    return this.busyIds().has(fileId);
  }

  private patchUpload(
    id: string,
    patch: Partial<UploadProgressItem>,
  ): void {
    this.uploads.update((items) =>
      items.map((item) => (item.id === id ? { ...item, ...patch } : item)),
    );
  }

  private setBusy(fileId: string, busy: boolean): void {
    this.busyIds.update((current) => {
      const next = new Set(current);
      if (busy) {
        next.add(fileId);
      } else {
        next.delete(fileId);
      }
      return next;
    });
  }

  private triggerBrowserDownload(blob: Blob, fileName: string): void {
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = fileName;
    anchor.click();
    URL.revokeObjectURL(url);
  }
}
