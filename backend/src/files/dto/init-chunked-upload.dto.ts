import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

export class InitChunkedUploadDto {
  @ApiProperty({ example: 'video.mp4' })
  @IsString({ message: 'Имя файла должно быть строкой' })
  @IsNotEmpty({ message: 'Укажите имя файла' })
  @MaxLength(255, {
    message: 'Имя файла должно содержать не более 255 символов',
  })
  @Matches(/^[^\\/]+$/, {
    message: 'Имя файла не должно содержать слэши',
  })
  originalName: string;

  @ApiPropertyOptional({ example: 'video/mp4' })
  @IsOptional()
  @IsString({ message: 'MIME-тип должен быть строкой' })
  @MaxLength(255, {
    message: 'MIME-тип должен содержать не более 255 символов',
  })
  mimeType?: string;

  @ApiProperty({
    example: 104857600,
    description: 'Полный размер файла в байтах (макс. 10 ГБ)',
  })
  @IsInt({ message: 'Размер файла должен быть целым числом' })
  @Min(1, { message: 'Размер файла должен быть больше 0' })
  @Max(10 * 1024 * 1024 * 1024, {
    message: 'Размер файла не должен превышать 10 ГБ',
  })
  size: number;

  @ApiPropertyOptional({
    example: 8 * 1024 * 1024,
    description: 'Размер чанка в байтах (по умолчанию 8 МБ, минимум 5 МБ если чанков больше одного)',
  })
  @IsOptional()
  @IsInt({ message: 'Размер чанка должен быть целым числом' })
  @Min(1, { message: 'Размер чанка слишком маленький' })
  @Max(32 * 1024 * 1024, {
    message: 'Размер чанка не должен превышать 32 МБ',
  })
  chunkSize?: number;
}
