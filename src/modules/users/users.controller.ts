import { Controller, Get, Param, HttpException, HttpStatus } from '@nestjs/common';
import { UserService } from './users.service';

/**
 * UserController - Controller xử lý các request liên quan đến user
 * 
 * Controller này chứa các endpoint để:
 * - Tìm user theo username
 * - Quản lý thông tin user
 */
@Controller('users')
export class UserController {
  constructor(private readonly userService: UserService) {}

  /**
   * Endpoint tìm user theo username
   * 
   * @param username - Username cần tìm (từ URL parameter)
   * @returns Object chứa thông tin user (không có password)
   * 
   * @example
   * // Request: GET /users/TNTT
   * // Response:
   * {
   *   "message": "User found successfully",
   *   "user": {
   *     "id": 1,
   *     "username": "TNTT",
   *     "email": "tntt@example.com",
   *     "role": "user"
   *   }
   * }
   */
  @Get(':username')
  async findByUsername(@Param('username') username: string) {
    try {
      // Gọi service để tìm user theo username
      const user = await this.userService.findByUsername(username);
      
      if (!user) {
        throw new HttpException(
          `User with username '${username}' not found`,
          HttpStatus.NOT_FOUND
        );
      }

      // Trả về thông tin user (không có password)
      return {
        message: 'User found successfully',
        user
      };
    } catch (error) {
      // Re-throw HttpException nếu đã có
      if (error instanceof HttpException) {
        throw error;
      }
      
      // Xử lý lỗi khác
      throw new HttpException(
        'Failed to find user',
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }
}
