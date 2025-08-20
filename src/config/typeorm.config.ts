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
export const typeOrmConfig = (configService: ConfigService): TypeOrmModuleOptions => ({
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

  // Đường dẫn tìm các file migration
  // Migrations được tạo bởi TypeORM CLI và lưu trong thư mục migrations
  migrations: [__dirname + '/../migrations/*.{ts,js}'],

  // Tự động đồng bộ schema database với entities
  // CHÚ Ý: Chỉ nên dùng true trong môi trường development
  // Production nên dùng migration để quản lý schema
  // Kiểm tra môi trường để quyết định có synchronize hay không
  synchronize: configService.get('NODE_ENV') === 'development',

  // Cấu hình logging cho TypeORM
  // Log các truy vấn SQL trong development để debug
  logging: configService.get('NODE_ENV') === 'development',

  // Cấu hình SSL cho production (nếu cần)
  ssl: configService.get('NODE_ENV') === 'production' ? { rejectUnauthorized: false } : false,

  // Cấu hình connection pool
  extra: {
    // Số lượng connection tối đa trong pool
    max: 20,
    // Thời gian timeout cho connection (ms)
    connectionTimeoutMillis: 30000,
    // Thời gian timeout cho query (ms)
    queryTimeoutMillis: 30000,
  },
});
