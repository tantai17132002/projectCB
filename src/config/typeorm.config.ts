// Import các module cần thiết từ NestJS
import { TypeOrmModuleOptions } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';

/**
 * Hàm cấu hình kết nối database cho TypeORM
 * 
 * @param configService - Service để đọc biến môi trường từ file .env
 * @returns Promise chứa cấu hình TypeORM
 * 
 * @example
 * // Sử dụng trong app.module.ts
 * TypeOrmModule.forRootAsync({
 *   useFactory: typeOrmConfig,
 *   inject: [ConfigService],
 * })
 */
export const typeOrmConfig = async (
  configService: ConfigService,
): Promise<TypeOrmModuleOptions> => ({
  // Loại database sử dụng (PostgreSQL)
  type: 'postgres',

  // Thông tin kết nối database từ biến môi trường
  host: configService.get('DB_HOST'), // Địa chỉ host database
  port: +configService.get('DB_PORT'), // Port (convert string thành number)
  username: configService.get('DB_USER'), // Tên đăng nhập database
  password: configService.get('DB_PASS'), // Mật khẩu database
  database: configService.get('DB_NAME'), // Tên database

  // Đường dẫn tìm các file entity (model) trong project
  // __dirname = thư mục hiện tại (src/config/)
  // /../ = lên một cấp (src/)
  // **/*.entity.{ts,js} = tìm tất cả file có đuôi .entity.ts hoặc .entity.js trong mọi thư mục con
  entities: [__dirname + '/../**/*.entity.{ts,js}'],

  // Tự động đồng bộ schema database với entities
  // true = tự động tạo/sửa bảng theo entities
  // CHÚ Ý: Chỉ nên dùng true trong môi trường development
  // Production nên dùng migration để quản lý schema
  synchronize: true, // true chỉ để phát triển
});
