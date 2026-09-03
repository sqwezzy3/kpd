import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { randomUUID } from 'node:crypto';
import type { Readable } from 'node:stream';
import { StoredFile } from './entities/stored-file.entity.js';
import { FileUploadStatus } from './entities/file-upload-status.js';
import { MinioService } from './minio.service.js';
import { RenameFileDto } from './dto/rename-file.dto.js';
import { InitChunkedUploadDto } from './dto/init-chunked-upload.dto.js';

export type UploadedChunkFile = {
  buffer: Buffer;
  size: number;
  mimetype?: string;
};

/** MinIO compose требует ≥ 5 MiB для всех частей, кроме последней */
const MIN_COMPOSE_CHUNK_SIZE = 5 * 1024 * 1024;
const DEFAULT_CHUNK_SIZE = 8 * 1024 * 1024;
const MAX_FILE_SIZE_BYTES = 1024 * 1024 * 1024;

@Injectable()
export class FilesService {
  private readonly maxFileSizeBytes: number;
  private readonly defaultChunkSize: number;

  constructor(
    @InjectRepository(StoredFile)
    private readonly filesRepository: Repository<StoredFile>,
    private readonly minioService: MinioService,
    configService: ConfigService,
  ) {
    const maxMb = Number(
      configService.get<string>('MAX_FILE_SIZE_MB', '1024'),
    );
    this.maxFileSizeBytes = Math.min(
      maxMb * 1024 * 1024,
      MAX_FILE_SIZE_BYTES,
    );
    this.defaultChunkSize = Number(
      configService.get<string>('UPLOAD_CHUNK_SIZE', String(DEFAULT_CHUNK_SIZE)),
    );
  }

  getMaxFileSizeBytes(): number {
    return this.maxFileSizeBytes;
  }

  async initChunkedUpload(ownerId: string, dto: InitChunkedUploadDto) {
    if (dto.size > this.maxFileSizeBytes) {
      throw new BadRequestException(
        `Размер файла не должен превышать ${Math.round(this.maxFileSizeBytes / (1024 * 1024))} МБ`,
      );
    }

    const originalName = this.sanitizeFileName(dto.originalName);
    const chunkSize = dto.chunkSize ?? this.defaultChunkSize;
    const totalChunks = Math.ceil(dto.size / chunkSize);

    if (totalChunks < 1) {
      throw new BadRequestException('Некорректный размер файла');
    }

    if (totalChunks > 1 && chunkSize < MIN_COMPOSE_CHUNK_SIZE) {
      throw new BadRequestException(
        `При загрузке несколькими чанками размер чанка должен быть не меньше ${MIN_COMPOSE_CHUNK_SIZE / (1024 * 1024)} МБ`,
      );
    }

    const id = randomUUID();
    const objectKey = this.minioService.finalObjectKey(
      ownerId,
      id,
      originalName,
    );

    const entity = this.filesRepository.create({
      id,
      ownerId,
      originalName,
      objectKey,
      mimeType: dto.mimeType?.trim() || 'application/octet-stream',
      size: String(dto.size),
      status: FileUploadStatus.UPLOADING,
      chunkSize,
      totalChunks,
      receivedChunks: [],
    });

    await this.filesRepository.save(entity);

    return {
      uploadId: id,
      fileId: id,
      chunkSize,
      totalChunks,
      maxFileSize: this.maxFileSizeBytes,
    };
  }

  async uploadChunk(
    ownerId: string,
    uploadId: string,
    chunkIndex: number,
    chunk: UploadedChunkFile,
  ) {
    const file = await this.getUploadOrFail(ownerId, uploadId);

    if (!Number.isInteger(chunkIndex) || chunkIndex < 0) {
      throw new BadRequestException('Некорректный индекс чанка');
    }

    if (chunkIndex >= (file.totalChunks ?? 0)) {
      throw new BadRequestException('Индекс чанка вне диапазона');
    }

    if (!chunk?.buffer?.length) {
      throw new BadRequestException('Чанк не передан');
    }

    const expectedSize = this.expectedChunkSize(file, chunkIndex);
    if (chunk.size !== expectedSize) {
      throw new BadRequestException(
        `Ожидался чанк размером ${expectedSize} байт, получено ${chunk.size}`,
      );
    }

    const partKey = this.minioService.partObjectKey(
      ownerId,
      uploadId,
      chunkIndex,
    );
    await this.minioService.putObject(
      partKey,
      chunk.buffer,
      chunk.size,
      'application/octet-stream',
    );

    const received = new Set(file.receivedChunks ?? []);
    received.add(chunkIndex);
    file.receivedChunks = [...received].sort((a, b) => a - b);
    await this.filesRepository.save(file);

    return {
      uploadId,
      chunkIndex,
      receivedChunks: file.receivedChunks,
      totalChunks: file.totalChunks ?? 0,
    };
  }

  async completeChunkedUpload(ownerId: string, uploadId: string) {
    const file = await this.getUploadOrFail(ownerId, uploadId);
    const totalChunks = file.totalChunks ?? 0;
    const received = new Set(file.receivedChunks ?? []);

    if (received.size !== totalChunks) {
      throw new BadRequestException(
        `Загружено ${received.size} из ${totalChunks} чанков`,
      );
    }

    for (let i = 0; i < totalChunks; i += 1) {
      if (!received.has(i)) {
        throw new BadRequestException(`Отсутствует чанк ${i}`);
      }
    }

    const partKeys = Array.from({ length: totalChunks }, (_, index) =>
      this.minioService.partObjectKey(ownerId, uploadId, index),
    );

    await this.minioService.composeObjects(
      file.objectKey,
      partKeys,
      file.mimeType,
    );
    await this.minioService.removeObjects(partKeys);

    file.status = FileUploadStatus.READY;
    file.receivedChunks = [];
    file.chunkSize = null;
    file.totalChunks = null;
    return this.filesRepository.save(file);
  }

  async abortChunkedUpload(ownerId: string, uploadId: string): Promise<void> {
    const file = await this.getUploadOrFail(ownerId, uploadId);
    const totalChunks = file.totalChunks ?? 0;
    const partKeys = Array.from({ length: totalChunks }, (_, index) =>
      this.minioService.partObjectKey(ownerId, uploadId, index),
    ).filter((_, index) => (file.receivedChunks ?? []).includes(index));

    await this.minioService.removeObjects(partKeys);
    await this.filesRepository.remove(file);
  }

  async getUploadStatus(ownerId: string, uploadId: string) {
    const file = await this.getUploadOrFail(ownerId, uploadId);
    return {
      uploadId: file.id,
      status: file.status,
      originalName: file.originalName,
      size: file.size,
      chunkSize: file.chunkSize ?? 0,
      totalChunks: file.totalChunks ?? 0,
      receivedChunks: file.receivedChunks ?? [],
    };
  }

  async listByOwner(ownerId: string): Promise<StoredFile[]> {
    return this.filesRepository.find({
      where: { ownerId, status: FileUploadStatus.READY },
      order: { createdAt: 'DESC' },
    });
  }

  async getOwnedOrFail(ownerId: string, fileId: string): Promise<StoredFile> {
    const file = await this.filesRepository.findOne({
      where: { id: fileId, ownerId, status: FileUploadStatus.READY },
    });
    if (!file) {
      throw new NotFoundException('Файл не найден');
    }
    return file;
  }

  async openStream(
    ownerId: string,
    fileId: string,
  ): Promise<{ file: StoredFile; stream: Readable }> {
    const file = await this.getOwnedOrFail(ownerId, fileId);
    const stream = await this.minioService.getObject(file.objectKey);
    return { file, stream };
  }

  async rename(
    ownerId: string,
    fileId: string,
    dto: RenameFileDto,
  ): Promise<StoredFile> {
    const file = await this.getOwnedOrFail(ownerId, fileId);
    const newName = this.sanitizeFileName(dto.name);

    if (newName === file.originalName) {
      return file;
    }

    const newObjectKey = this.minioService.finalObjectKey(
      ownerId,
      file.id,
      newName,
    );
    await this.minioService.copyObject(file.objectKey, newObjectKey);
    await this.minioService.removeObject(file.objectKey);

    file.originalName = newName;
    file.objectKey = newObjectKey;
    return this.filesRepository.save(file);
  }

  async remove(ownerId: string, fileId: string): Promise<void> {
    const file = await this.getOwnedOrFail(ownerId, fileId);
    await this.minioService.removeObject(file.objectKey);
    await this.filesRepository.remove(file);
  }

  private async getUploadOrFail(
    ownerId: string,
    uploadId: string,
  ): Promise<StoredFile> {
    const file = await this.filesRepository.findOne({
      where: {
        id: uploadId,
        ownerId,
        status: FileUploadStatus.UPLOADING,
      },
    });
    if (!file) {
      throw new NotFoundException('Сессия загрузки не найдена');
    }
    return file;
  }

  private expectedChunkSize(file: StoredFile, chunkIndex: number): number {
    const totalSize = Number(file.size);
    const chunkSize = file.chunkSize ?? this.defaultChunkSize;
    const totalChunks = file.totalChunks ?? 1;
    const isLast = chunkIndex === totalChunks - 1;

    if (isLast) {
      const remainder = totalSize % chunkSize;
      return remainder === 0 ? chunkSize : remainder;
    }

    return chunkSize;
  }

  private sanitizeFileName(name: string): string {
    const trimmed = name.trim().replace(/[\\/]+/g, '_');
    if (!trimmed) {
      throw new BadRequestException('Некорректное имя файла');
    }
    return trimmed.slice(0, 255);
  }
}
