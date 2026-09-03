import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, Matches, MaxLength } from 'class-validator';

export class RenameFileDto {
  @ApiProperty({ example: 'new-name.pdf' })
  @IsString({ message: 'Имя файла должно быть строкой' })
  @IsNotEmpty({ message: 'Укажите новое имя файла' })
  @MaxLength(255, { message: 'Имя файла должно содержать не более 255 символов' })
  @Matches(/^[^\\/]+$/, {
    message: 'Имя файла не должно содержать слэши',
  })
  name: string;
}
