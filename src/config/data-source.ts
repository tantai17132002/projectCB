import { DataSource } from 'typeorm';
import { config } from 'dotenv';

// Load biến môi trường từ .env
config();

/**
 * DataSource dùng cho TypeORM CLI
 * Chỉ dùng khi generate/run/revert migration
 *
 * Lưu ý:
 * - CLI chỉ làm việc với file JS đã build ra trong dist
 * - Không bao giờ dùng synchronize = true trong CLI
 * - Luôn dùng migrations để quản lý schema
 */
export default new DataSource({
  type: 'postgres',

  // Đọc trực tiếp từ process.env (không dùng ConfigService)
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT),
  username: process.env.DB_USER,
  password: process.env.DB_PASS,
  database: process.env.DB_NAME,

  // CLI sẽ làm việc với file JS đã build ra trong dist
  entities: ['dist/**/*.entity.js'],
  migrations: ['dist/migrations/*.js'],

  // KHÔNG BAO GIỜ dùng synchronize = true trong CLI
  // Luôn dùng migrations để quản lý schema
  synchronize: false,

  // Cấu hình logging cho CLI
  // Log các truy vấn SQL khi chạy migrations
  logging: true,

  // Cấu hình SSL cho production (nếu cần)
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,

  // Cấu hình connection pool cho CLI
  extra: {
    // Số lượng connection tối đa trong pool
    max: 10,
    // Thời gian timeout cho connection (ms)
    connectionTimeoutMillis: 30000,
    // Thời gian timeout cho query (ms)
    queryTimeoutMillis: 30000,
  },
});
