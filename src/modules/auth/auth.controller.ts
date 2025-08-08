// Import các decorator và module cần thiết từ NestJS
import { Body, Controller, Post, HttpException, HttpStatus } from '@nestjs/common';
import { CreateUsersDto } from '@/modules/users/dto/create-users.dto';
import { UserService } from '@/modules/users/users.service';

/**
 * AuthController - Controller xử lý các request liên quan đến authentication
 *
 * Controller này chứa các endpoint để:
 * - Đăng ký user mới (register)
 * - Đăng nhập user (login)
 * - Quản lý authentication và authorization
 *
 * @description
 * Sử dụng prefix 'auth' cho tất cả routes
 * Ví dụ: POST /auth/register, POST /auth/login
 */
@Controller('auth')
export class AuthController {
  constructor(private readonly userService: UserService) {}

  /**
   * Endpoint đăng ký user mới
   *
   * @param createUserDto - Dữ liệu user từ request body (username, email, password)
   * @returns Object chứa message thành công và thông tin user đã tạo
   *
   * @example
   * // Request: POST /auth/register
   * // Body:
   * {
   *   "username": "john_doe",
   *   "email": "john@example.com",
   *   "password": "password123"
   * }
   *
   * // Response:
   * {
   *   "message": "User registered successfully",
   *   "user": {
   *     "id": 1,
   *     "username": "john_doe",
   *     "email": "john@example.com",
   *     "role": "user"
   *   }
   * }
   */
  @Post('register')
  async register(@Body() createUserDto: CreateUsersDto) {
    try {
      // Gọi service để tạo user mới với mật khẩu đã mã hóa
      const user = await this.userService.createUser(createUserDto);

      // Trả về response thành công với thông tin user
      // Lưu ý: password sẽ không được trả về do @Exclude() trong entity
      return {
        message: 'User registered successfully',
        user,
      };
    } catch (error) {
      // Xử lý lỗi nhân bản username/email
      if (error.code === '23505') { // Lỗi ràng buộc duy nhất của PostgreSQL
        throw new HttpException(
          'Username or email already exists',
          HttpStatus.CONFLICT
        );
      }
      
      // Xử lý các lỗi khác
      throw new HttpException(
        'Internal server error',
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }
}
