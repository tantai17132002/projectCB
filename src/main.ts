// Import các module cần thiết từ NestJS
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';

/**
 * Hàm bootstrap - Khởi tạo và chạy ứng dụng NestJS
 * 
 * Đây là entry point chính của ứng dụng, thực hiện các bước:
 * 1. Tạo ứng dụng NestJS từ AppModule
 * 2. Cấu hình global validation pipe
 * 3. Cấu hình Swagger documentation
 * 4. Khởi động server
 * 
 * @returns Promise<void> - Không trả về giá trị
 */
async function bootstrap() {
  // Tạo instance của ứng dụng NestJS từ AppModule
  const app = await NestFactory.create(AppModule);

  // Cấu hình global validation pipe để validate dữ liệu
  // whitelist: true = chỉ cho phép các property được định nghĩa trong DTO
  app.useGlobalPipes(new ValidationPipe({ whitelist: true }));

  // Cấu hình Swagger/OpenAPI documentation
  const config = new DocumentBuilder()
    .setTitle('Todo API') // Tiêu đề API
    .setDescription('NestJS Todo App with Auth') // Mô tả API
    .setVersion('1.0') // Phiên bản API
    .addBearerAuth() // Thêm authentication Bearer token
    .build();

  // Tạo document Swagger từ cấu hình
  const document = SwaggerModule.createDocument(app, config);

  // Setup Swagger UI tại đường dẫn /api
  // Có thể truy cập: http://localhost:3000/api
  SwaggerModule.setup('api', app, document);

  // Khởi động server trên port được chỉ định
  // Lấy PORT từ biến môi trường, nếu không có thì dùng 3000
  await app.listen(process.env.PORT || 3000);
}

// Gọi hàm bootstrap để khởi động ứng dụng
bootstrap();
