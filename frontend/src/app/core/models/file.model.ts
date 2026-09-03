export type StoredFile = {
  id: string;
  originalName: string;
  mimeType: string;
  size: string;
  status?: string;
  createdAt: string;
  updatedAt: string;
};

export type InitChunkedUploadResponse = {
  uploadId: string;
  fileId: string;
  chunkSize: number;
  totalChunks: number;
  maxFileSize: number;
};

export type ChunkUploadResponse = {
  uploadId: string;
  chunkIndex: number;
  receivedChunks: number[];
  totalChunks: number;
};

export type UploadProgressItem = {
  id: string;
  fileName: string;
  progress: number;
  status: 'uploading' | 'completing' | 'done' | 'error';
  error?: string;
};
