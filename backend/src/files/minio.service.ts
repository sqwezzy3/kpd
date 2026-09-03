import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as Minio from 'minio';
import type { Readable } from 'node:stream';

@Injectable()
export class MinioService implements OnModuleInit {
  private readonly logger = new Logger(MinioService.name);
  private readonly client: Minio.Client;
  private readonly bucket: string;

  constructor(private readonly configService: ConfigService) {
    const endPoint = this.configService.getOrThrow<string>('MINIO_ENDPOINT');
    const port = Number(this.configService.get<string>('MINIO_PORT', '9000'));
    const useSSL =
      this.configService.get<string>('MINIO_USE_SSL', 'false') === 'true';
    const accessKey = this.configService.getOrThrow<string>('MINIO_ACCESS_KEY');
    const secretKey = this.configService.getOrThrow<string>('MINIO_SECRET_KEY');
    this.bucket = this.configService.get<string>('MINIO_BUCKET', 'kpd');

    this.client = new Minio.Client({
      endPoint,
      port,
      useSSL,
      accessKey,
      secretKey,
    });
  }

  async onModuleInit(): Promise<void> {
    const exists = await this.client.bucketExists(this.bucket);
    if (!exists) {
      await this.client.makeBucket(this.bucket, 'us-east-1');
      this.logger.log(`Создан bucket «${this.bucket}»`);
    } else {
      this.logger.log(`Bucket «${this.bucket}» уже существует`);
    }
  }

  getBucket(): string {
    return this.bucket;
  }

  partObjectKey(ownerId: string, fileId: string, chunkIndex: number): string {
    return `${ownerId}/${fileId}/.parts/${String(chunkIndex).padStart(6, '0')}`;
  }

  finalObjectKey(ownerId: string, fileId: string, originalName: string): string {
    return `${ownerId}/${fileId}/${originalName}`;
  }

  async putObject(
    objectKey: string,
    data: Buffer | Readable,
    size: number,
    mimeType: string,
  ): Promise<void> {
    await this.client.putObject(this.bucket, objectKey, data, size, {
      'Content-Type': mimeType,
    });
  }

  async getObject(objectKey: string): Promise<Readable> {
    return this.client.getObject(this.bucket, objectKey);
  }

  async removeObject(objectKey: string): Promise<void> {
    await this.client.removeObject(this.bucket, objectKey);
  }

  async removeObjects(objectKeys: string[]): Promise<void> {
    if (!objectKeys.length) {
      return;
    }
    await this.client.removeObjects(this.bucket, objectKeys);
  }

  async copyObject(sourceKey: string, targetKey: string): Promise<void> {
    const source = new Minio.CopySourceOptions({
      Bucket: this.bucket,
      Object: sourceKey,
    });
    const dest = new Minio.CopyDestinationOptions({
      Bucket: this.bucket,
      Object: targetKey,
    });
    await this.client.copyObject(source, dest);
  }

  async composeObjects(
    targetKey: string,
    sourceKeys: string[],
    mimeType: string,
  ): Promise<void> {
    if (sourceKeys.length === 0) {
      throw new Error('Нет частей для объединения');
    }

    if (sourceKeys.length === 1) {
      await this.copyObject(sourceKeys[0]!, targetKey);
      return;
    }

    const sources = sourceKeys.map(
      (objectKey) =>
        new Minio.CopySourceOptions({
          Bucket: this.bucket,
          Object: objectKey,
        }),
    );
    const dest = new Minio.CopyDestinationOptions({
      Bucket: this.bucket,
      Object: targetKey,
      UserMetadata: {
        'Content-Type': mimeType,
      },
      Headers: {
        'Content-Type': mimeType,
      },
    });

    await this.client.composeObject(dest, sources);
  }
}
