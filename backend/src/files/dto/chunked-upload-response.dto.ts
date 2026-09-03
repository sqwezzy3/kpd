import { ApiProperty } from '@nestjs/swagger';

export class InitChunkedUploadResponseDto {
  @ApiProperty({ format: 'uuid' })
  uploadId: string;

  @ApiProperty({ format: 'uuid' })
  fileId: string;

  @ApiProperty({ example: 8388608 })
  chunkSize: number;

  @ApiProperty({ example: 12 })
  totalChunks: number;

  @ApiProperty({ example: 1073741824 })
  maxFileSize: number;
}

export class ChunkUploadResponseDto {
  @ApiProperty({ format: 'uuid' })
  uploadId: string;

  @ApiProperty({ example: 0 })
  chunkIndex: number;

  @ApiProperty({ example: [0, 1, 2], type: [Number] })
  receivedChunks: number[];

  @ApiProperty({ example: 12 })
  totalChunks: number;
}

export class UploadStatusResponseDto {
  @ApiProperty({ format: 'uuid' })
  uploadId: string;

  @ApiProperty({ example: 'uploading' })
  status: string;

  @ApiProperty({ example: 'video.mp4' })
  originalName: string;

  @ApiProperty({ example: '104857600' })
  size: string;

  @ApiProperty({ example: 8388608 })
  chunkSize: number;

  @ApiProperty({ example: 12 })
  totalChunks: number;

  @ApiProperty({ example: [0, 1], type: [Number] })
  receivedChunks: number[];
}
