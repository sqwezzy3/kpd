import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Header,
  Param,
  ParseIntPipe,
  ParseUUIDPipe,
  Patch,
  Post,
  Put,
  StreamableFile,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
  ApiNotFoundResponse,
  ApiBadRequestResponse,
} from '@nestjs/swagger';
import { memoryStorage } from 'multer';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import type { User } from '../users/entities/user.entity.js';
import { FilesService, type UploadedChunkFile } from './files.service.js';
import { FileResponseDto } from './dto/file-response.dto.js';
import { RenameFileDto } from './dto/rename-file.dto.js';
import { InitChunkedUploadDto } from './dto/init-chunked-upload.dto.js';
import {
  ChunkUploadResponseDto,
  InitChunkedUploadResponseDto,
  UploadStatusResponseDto,
} from './dto/chunked-upload-response.dto.js';

@ApiTags('files')
@ApiBearerAuth('JWT')
@UseGuards(JwtAuthGuard)
@ApiUnauthorizedResponse({ description: 'Необходима авторизация' })
@Controller('files')
export class FilesController {
  constructor(private readonly filesService: FilesService) {}

  @Post('uploads')
  @ApiOperation({ summary: 'Инициализировать почанковую загрузку' })
  @ApiCreatedResponse({ type: InitChunkedUploadResponseDto })
  @ApiBadRequestResponse({ description: 'Некорректные параметры загрузки' })
  async initUpload(
    @CurrentUser() user: User,
    @Body() dto: InitChunkedUploadDto,
  ) {
    return this.filesService.initChunkedUpload(user.id, dto);
  }

  @Put('uploads/:uploadId/chunks/:chunkIndex')
  @ApiOperation({ summary: 'Загрузить чанк файла' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      required: ['chunk'],
      properties: {
        chunk: { type: 'string', format: 'binary' },
      },
    },
  })
  @ApiOkResponse({ type: ChunkUploadResponseDto })
  @ApiBadRequestResponse({ description: 'Некорректный чанк' })
  @ApiNotFoundResponse({ description: 'Сессия загрузки не найдена' })
  @UseInterceptors(
    FileInterceptor('chunk', {
      storage: memoryStorage(),
      limits: {
        // Чуть больше максимального чанка (32 МБ + запас)
        fileSize: 33 * 1024 * 1024,
      },
    }),
  )
  async uploadChunk(
    @CurrentUser() user: User,
    @Param('uploadId', ParseUUIDPipe) uploadId: string,
    @Param('chunkIndex', ParseIntPipe) chunkIndex: number,
    @UploadedFile() chunk: UploadedChunkFile,
  ) {
    if (!chunk) {
      throw new BadRequestException('Чанк не передан');
    }
    return this.filesService.uploadChunk(user.id, uploadId, chunkIndex, chunk);
  }

  @Post('uploads/:uploadId/complete')
  @ApiOperation({ summary: 'Завершить почанковую загрузку' })
  @ApiOkResponse({ type: FileResponseDto })
  @ApiBadRequestResponse({ description: 'Не все чанки загружены' })
  @ApiNotFoundResponse({ description: 'Сессия загрузки не найдена' })
  async completeUpload(
    @CurrentUser() user: User,
    @Param('uploadId', ParseUUIDPipe) uploadId: string,
  ) {
    return this.filesService.completeChunkedUpload(user.id, uploadId);
  }

  @Get('uploads/:uploadId')
  @ApiOperation({ summary: 'Статус почанковой загрузки' })
  @ApiOkResponse({ type: UploadStatusResponseDto })
  @ApiNotFoundResponse({ description: 'Сессия загрузки не найдена' })
  async uploadStatus(
    @CurrentUser() user: User,
    @Param('uploadId', ParseUUIDPipe) uploadId: string,
  ) {
    return this.filesService.getUploadStatus(user.id, uploadId);
  }

  @Delete('uploads/:uploadId')
  @ApiOperation({ summary: 'Отменить почанковую загрузку' })
  @ApiOkResponse({ description: 'Загрузка отменена' })
  @ApiNotFoundResponse({ description: 'Сессия загрузки не найдена' })
  async abortUpload(
    @CurrentUser() user: User,
    @Param('uploadId', ParseUUIDPipe) uploadId: string,
  ) {
    await this.filesService.abortChunkedUpload(user.id, uploadId);
    return { message: 'Загрузка отменена' };
  }

  @Get()
  @ApiOperation({ summary: 'Список файлов текущего пользователя' })
  @ApiOkResponse({ type: FileResponseDto, isArray: true })
  async list(@CurrentUser() user: User) {
    return this.filesService.listByOwner(user.id);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Метаданные файла' })
  @ApiOkResponse({ type: FileResponseDto })
  @ApiNotFoundResponse({ description: 'Файл не найден' })
  async getOne(
    @CurrentUser() user: User,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.filesService.getOwnedOrFail(user.id, id);
  }

  @Get(':id/download')
  @ApiOperation({ summary: 'Скачать файл' })
  @ApiNotFoundResponse({ description: 'Файл не найден' })
  @Header('Cache-Control', 'no-store')
  async download(
    @CurrentUser() user: User,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<StreamableFile> {
    const { file, stream } = await this.filesService.openStream(user.id, id);
    return new StreamableFile(stream, {
      type: file.mimeType,
      disposition: this.contentDisposition('attachment', file.originalName),
      length: Number(file.size),
    });
  }

  @Get(':id/view')
  @ApiOperation({ summary: 'Просмотр файла (inline)' })
  @ApiNotFoundResponse({ description: 'Файл не найден' })
  @Header('Cache-Control', 'private, max-age=60')
  async view(
    @CurrentUser() user: User,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<StreamableFile> {
    const { file, stream } = await this.filesService.openStream(user.id, id);
    return new StreamableFile(stream, {
      type: file.mimeType,
      disposition: this.contentDisposition('inline', file.originalName),
      length: Number(file.size),
    });
  }

  @Patch(':id/rename')
  @ApiOperation({ summary: 'Переименовать файл' })
  @ApiOkResponse({ type: FileResponseDto })
  @ApiNotFoundResponse({ description: 'Файл не найден' })
  @ApiBadRequestResponse({ description: 'Некорректное имя' })
  async rename(
    @CurrentUser() user: User,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: RenameFileDto,
  ) {
    return this.filesService.rename(user.id, id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Удалить файл' })
  @ApiOkResponse({ description: 'Файл удалён' })
  @ApiNotFoundResponse({ description: 'Файл не найден' })
  async remove(
    @CurrentUser() user: User,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    await this.filesService.remove(user.id, id);
    return { message: 'Файл удалён' };
  }

  private contentDisposition(
    type: 'attachment' | 'inline',
    filename: string,
  ): string {
    const encoded = encodeURIComponent(filename);
    const safe = filename.replace(/"/g, '');
    return `${type}; filename="${safe}"; filename*=UTF-8''${encoded}`;
  }
}
