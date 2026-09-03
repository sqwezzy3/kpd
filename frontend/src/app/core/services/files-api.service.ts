import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, firstValueFrom } from 'rxjs';
import { environment } from '../../../environments/environment';
import type {
  ChunkUploadResponse,
  InitChunkedUploadResponse,
  StoredFile,
} from '../models/file.model';

@Injectable({ providedIn: 'root' })
export class FilesApiService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/files`;

  list(): Observable<StoredFile[]> {
    return this.http.get<StoredFile[]>(this.baseUrl);
  }

  initUpload(payload: {
    originalName: string;
    mimeType: string;
    size: number;
    chunkSize?: number;
  }): Observable<InitChunkedUploadResponse> {
    return this.http.post<InitChunkedUploadResponse>(
      `${this.baseUrl}/uploads`,
      payload,
    );
  }

  uploadChunk(
    uploadId: string,
    chunkIndex: number,
    chunk: Blob,
  ): Observable<ChunkUploadResponse> {
    const form = new FormData();
    form.append('chunk', chunk, `chunk-${chunkIndex}`);
    return this.http.put<ChunkUploadResponse>(
      `${this.baseUrl}/uploads/${uploadId}/chunks/${chunkIndex}`,
      form,
    );
  }

  completeUpload(uploadId: string): Observable<StoredFile> {
    return this.http.post<StoredFile>(
      `${this.baseUrl}/uploads/${uploadId}/complete`,
      {},
    );
  }

  abortUpload(uploadId: string): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(
      `${this.baseUrl}/uploads/${uploadId}`,
    );
  }

  rename(fileId: string, name: string): Observable<StoredFile> {
    return this.http.patch<StoredFile>(`${this.baseUrl}/${fileId}/rename`, {
      name,
    });
  }

  remove(fileId: string): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(`${this.baseUrl}/${fileId}`);
  }

  downloadBlob(fileId: string): Observable<Blob> {
    return this.http.get(`${this.baseUrl}/${fileId}/download`, {
      responseType: 'blob',
    });
  }

  viewBlob(fileId: string): Observable<Blob> {
    return this.http.get(`${this.baseUrl}/${fileId}/view`, {
      responseType: 'blob',
    });
  }

  async uploadFile(
    file: File,
    onProgress?: (percent: number) => void,
  ): Promise<StoredFile> {
    const init = await firstValueFrom(
      this.initUpload({
        originalName: file.name,
        mimeType: file.type || 'application/octet-stream',
        size: file.size,
      }),
    );

    const { uploadId, chunkSize, totalChunks } = init;

    try {
      for (let index = 0; index < totalChunks; index += 1) {
        const start = index * chunkSize;
        const end = Math.min(file.size, start + chunkSize);
        const chunk = file.slice(start, end);
        await firstValueFrom(this.uploadChunk(uploadId, index, chunk));
        onProgress?.(Math.round(((index + 1) / totalChunks) * 100));
      }

      onProgress?.(99);
      const stored = await firstValueFrom(this.completeUpload(uploadId));
      onProgress?.(100);
      return stored;
    } catch (error) {
      try {
        await firstValueFrom(this.abortUpload(uploadId));
      } catch {
        // ignore abort errors
      }
      throw error;
    }
  }
}
