import { Module } from '@nestjs/common';
import { AuthController } from '@/modules/auth/auth.controller';
import { UserModule } from '@/modules/users/users.module';
import { AuthService } from '@/modules/auth/auth.service';

/**
 * AuthModule - Module quản lý authentication và authorization
 * 
 * Module này tổ chức và kết nối các thành phần:
 * - AuthController: Xử lý HTTP requests cho auth (register, login)
 * - AuthService: Business logic cho authentication
 * - UserModule: Import để sử dụng UserService
 * 
 * @description
 * Đây là một feature module chuyên về authentication
 * Có thể mở rộng thêm JWT, OAuth, etc.
 */
@Module({
  imports: [
    // Import UserModule để sử dụng UserService
    // UserModule đã export UserService nên có thể sử dụng ở đây
    UserModule,
  ],
  
  // Khai báo các controller xử lý HTTP requests cho auth
  // AuthController sẽ xử lý các endpoint như /auth/register, /auth/login
  controllers: [AuthController],
  
  // Khai báo các service chứa business logic cho authentication
  // AuthService sẽ xử lý logic đăng nhập, tạo JWT token, etc.
  providers: [AuthService],
})
export class AuthModule {}
