import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UsersEntity } from '@/modules/users/entity/users.entity';
import { UserService } from '@/modules/users/users.service';
import { UserController } from '@/modules/users/users.controller';

/**
 * UserModule - Module quản lý tất cả các thành phần liên quan đến user
 *
 * Module này tổ chức và kết nối các thành phần:
 * - Entity: Định nghĩa cấu trúc dữ liệu user
 * - Service: Xử lý business logic
 * - Controller: Xử lý HTTP requests
 * - Repository: Tương tác với database
 *
 * @description
 * Đây là một feature module theo kiến trúc NestJS
 * Mỗi module có thể được import vào module khác
 */
@Module({
  imports: [
    // Import TypeORM repository cho UsersEntity
    // forFeature() = đăng ký entity để có thể inject repository
    TypeOrmModule.forFeature([UsersEntity]),
  ],

  // Khai báo các controller xử lý HTTP requests
  // Controller sẽ nhận requests và gọi service
  controllers: [UserController],

  // Khai báo các service chứa business logic
  // Service sẽ được inject vào controller
  providers: [UserService],

  // Export service để các module khác có thể sử dụng
  // Ví dụ: AuthModule có thể import UserService
  exports: [UserService],
})
export class UserModule {}
