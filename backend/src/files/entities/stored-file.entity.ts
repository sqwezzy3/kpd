import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Exclude } from 'class-transformer';
import { User } from '../../users/entities/user.entity.js';
import { FileUploadStatus } from './file-upload-status.js';

@Entity('files')
export class StoredFile {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ type: 'uuid' })
  ownerId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'ownerId' })
  @Exclude()
  owner: User;

  @Column({ length: 255 })
  originalName: string;

  @Column({ length: 512 })
  @Exclude()
  objectKey: string;

  @Column({ length: 255 })
  mimeType: string;

  @Column({ type: 'bigint' })
  size: string;

  @Column({
    type: 'varchar',
    length: 32,
    default: FileUploadStatus.READY,
  })
  status: FileUploadStatus;

  @Column({ type: 'int', nullable: true })
  @Exclude()
  chunkSize: number | null;

  @Column({ type: 'int', nullable: true })
  @Exclude()
  totalChunks: number | null;

  @Column({ type: 'jsonb', default: [] })
  @Exclude()
  receivedChunks: number[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
