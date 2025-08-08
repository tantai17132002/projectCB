// Import các module cần thiết từ NestJS
import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';

// Import các module để cấu hình
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { typeOrmConfig } from './config/typeorm.config';
import { AuthModule } from '@/modules/auth/auth.module';
import { UserModule } from '@/modules/users/users.module';

/**
 * AppModule - Module chính của ứng dụng NestJS
 * 
 * Đây là module gốc, chứa tất cả các module khác và cấu hình chung
 * 
 * @description
 * - Cấu hình ConfigModule để đọc biến môi trường
 * - Cấu hình TypeORM để kết nối database
 * - Khai báo các controller và service chính
 */
@Module({
  imports: [
    // Cấu hình ConfigModule để đọc biến môi trường từ file .env
    ConfigModule.forRoot({
      isGlobal: true, // Làm cho ConfigModule có thể sử dụng ở mọi nơi trong app
    }),

    // Cấu hình TypeORM để kết nối database
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule], // Import ConfigModule để sử dụng ConfigService
      inject: [ConfigService], // Inject ConfigService vào factory function
      useFactory: typeOrmConfig, // Sử dụng hàm typeOrmConfig để tạo cấu hình
    }),

    // Import AuthModule để sử dụng AuthService
    AuthModule,

    // Import UserModule để sử dụng UserService
    UserModule,
  ],

  // Khai báo các controller (xử lý HTTP requests)
  controllers: [AppController],

  // Khai báo các service (business logic)
  providers: [AppService],
})
export class AppModule {}
