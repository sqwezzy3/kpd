import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from './auth/auth.module.js';
import { UsersModule } from './users/users.module.js';
import { FilesModule } from './files/files.module.js';
import { HealthController } from './health.controller.js';
import { User } from './users/entities/user.entity.js';
import { StoredFile } from './files/entities/stored-file.entity.js';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env', '../.env'],
    }),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        type: 'postgres' as const,
        host: configService.get<string>('DB_HOST', 'localhost'),
        port: configService.get<number>('DB_PORT', 5432),
        username: configService.get<string>('DB_USER', 'kpd'),
        password: configService.get<string>('DB_PASSWORD', 'kpd'),
        database: configService.get<string>('DB_NAME', 'kpd'),
        entities: [User, StoredFile],
        synchronize: configService.get<string>('DB_SYNC', 'true') === 'true',
        logging: configService.get<string>('DB_LOGGING', 'false') === 'true',
      }),
    }),
    UsersModule,
    AuthModule,
    FilesModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}
