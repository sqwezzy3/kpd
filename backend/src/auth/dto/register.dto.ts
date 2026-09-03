import { IsEmail, IsString, MinLength, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class RegisterDto {
  @ApiProperty({ example: 'user@example.com' })
  @IsEmail({}, { message: 'Укажите корректный email' })
  email: string;

  @ApiProperty({ example: 'password123', minLength: 8, maxLength: 72 })
  @IsString({ message: 'Пароль должен быть строкой' })
  @MinLength(8, {
    message: 'Пароль должен содержать не менее 8 символов',
  })
  @MaxLength(72, {
    message: 'Пароль должен содержать не более 72 символов',
  })
  password: string;

  @ApiProperty({ example: 'User', minLength: 2, maxLength: 100 })
  @IsString({ message: 'Имя должно быть строкой' })
  @MinLength(2, {
    message: 'Имя должно содержать не менее 2 символов',
  })
  @MaxLength(100, {
    message: 'Имя должно содержать не более 100 символов',
  })
  name: string;
}
