import { IsNotEmpty, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

/**
 * LoginDto - Data Transfer Object cho việc đăng nhập
 *
 * DTO này định nghĩa cấu trúc dữ liệu mà client cần gửi khi đăng nhập
 * Sử dụng class-validator để validate dữ liệu đầu vào
 * Có thể đăng nhập bằng username hoặc email
 *
 * @example
 * // Client gửi request POST /auth/login với body:
 * // Cách 1: Đăng nhập bằng username
 * {
 *   "usernameOrEmail": "john_doe",
 *   "password": "password123"
 * }
 * 
 * // Cách 2: Đăng nhập bằng email
 * {
 *   "usernameOrEmail": "john@example.com",
 *   "password": "password123"
 * }
 */
export class LoginDto {
  /**
   * Tên đăng nhập hoặc email của người dùng
   * @IsNotEmpty() - Bắt buộc phải có giá trị, không được để trống
   *
   * @example "john_doe" hoặc "john@example.com"
   */
  @ApiProperty({
    description: 'Username or email of the user',
    example: 'john_doe',
    required: true
  })
  @IsNotEmpty()
  usernameOrEmail: string;

  @ApiProperty({
    description: 'Password of the user',
    example: 'password123',
    required: true,
    minLength: 8
  })
  @IsNotEmpty()
  @MinLength(8)
  password: string;
}
