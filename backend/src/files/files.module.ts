import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PassportModule } from '@nestjs/passport';
import { StoredFile } from './entities/stored-file.entity.js';
import { FilesService } from './files.service.js';
import { FilesController } from './files.controller.js';
import { MinioService } from './minio.service.js';

@Module({
  imports: [
    TypeOrmModule.forFeature([StoredFile]),
    PassportModule.register({ defaultStrategy: 'jwt' }),
  ],
  controllers: [FilesController],
  providers: [FilesService, MinioService],
  exports: [FilesService],
})
export class FilesModule {}
