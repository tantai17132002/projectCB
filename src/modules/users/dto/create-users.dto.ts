import { IsEmail, IsNotEmpty, MinLength } from 'class-validator';

/**
 * CreateUsersDto - Data Transfer Object cho việc tạo user mới
 *
 * DTO này định nghĩa cấu trúc dữ liệu và validation rules
 * khi client gửi request tạo user mới
 *
 * @example
 * // Request body khi tạo user
 * {
 *   "username": "john_doe",
 *   "email": "john@example.com",
 *   "password": "password123"
 * }
 */
export class CreateUsersDto {
  /**
   * Tên đăng nhập của user
   * @IsNotEmpty() = không được để trống
   * Validation: Bắt buộc phải có giá trị
   */
  @IsNotEmpty()
  username: string;

  /**
   * Email của user
   * @IsEmail() = phải đúng định dạng email
   * Validation: Kiểm tra format email hợp lệ (có @, domain, etc.)
   */
  @IsEmail()
  email: string;

  /**
   * Mật khẩu của user
   * @MinLength(8) = độ dài tối thiểu 8 ký tự
   * Validation: Đảm bảo mật khẩu đủ mạnh
   */
  @MinLength(8)
  password: string;
}
