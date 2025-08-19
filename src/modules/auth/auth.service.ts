import { Injectable, UnauthorizedException } from '@nestjs/common';
import { UserService } from '@/modules/users/users.service';
import * as bcrypt from 'bcryptjs';
import { JwtService } from '@nestjs/jwt';
import { UsersEntity } from '@/modules/users/entity/users.entity';
import { CreateUsersDto } from '@/modules/users/dto/create-users.dto';
import { RegisterResponseDto, LoginResponseDto } from '@/modules/auth/dto/auth-response.dto';
import { LoginDto } from '@/modules/auth/dto/login.dto';

/**
 * AuthService - Service xử lý xác thực và phân quyền
 *
 * Service này chịu trách nhiệm:
 * - Xác thực người dùng (validate username/password)
 * - Tạo JWT token cho người dùng đã đăng nhập
 * - Quản lý quá trình đăng nhập
 */
@Injectable()
export class AuthService {
  constructor(
    private usersService: UserService, // Service để tương tác với user data
    private jwtService: JwtService, // Service để tạo và verify JWT token
  ) {}

  /**
   * Xác thực người dùng bằng username/email và password
   *
   * @param usernameOrEmail - Username hoặc email đăng nhập của người dùng
   * @param password - Mật khẩu chưa mã hóa từ người dùng
   * @returns Promise<UsersEntity> - Thông tin user nếu xác thực thành công
   * @throws UnauthorizedException - Nếu user không tồn tại hoặc sai mật khẩu
   *
   * @example
   * const user = await authService.validateUser("john_doe", "password123");
   * const user2 = await authService.validateUser("john@example.com", "password123");
   */
  async validateUser(usernameOrEmail: string, password: string): Promise<UsersEntity> {
    // Tìm user trong database theo username hoặc email (bao gồm password để so sánh)
    const user = await this.usersService.findByUsernameOrEmail(usernameOrEmail);
    if (!user) throw new UnauthorizedException('User not found');

    // So sánh password người dùng nhập với password đã mã hóa trong database
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) throw new UnauthorizedException('Wrong password');

    // Trả về thông tin user nếu xác thực thành công
    return user;
  }

  /**
   * Tạo JWT token cho người dùng đã đăng nhập
   *
   * @param user - Thông tin user đã được xác thực
   * @returns Object chứa access_token
   *
   * @example
   * const result = await authService.login(user);
   * console.log(result.access_token); // JWT token
   */
  async login(user: UsersEntity): Promise<LoginResponseDto> {
    // Tạo payload cho JWT token (thông tin sẽ được mã hóa trong token)
    const payload = {
      sub: user.id, // Subject - ID của user
      username: user.username, // Tên đăng nhập
      role: user.role, // Vai trò của user (user/admin)
    };

    // Trả về object chứa JWT token đã được ký
    return {
      access_token: this.jwtService.sign(payload),
    };
  }

  /**
   * Xử lý đăng nhập user
   *
   * @param loginDto - Dữ liệu đăng nhập từ request body
   * @returns LoginResponseDto - JWT access token
   * @throws UnauthorizedException - Nếu thông tin đăng nhập không chính xác
   */
  async processLogin(loginDto: LoginDto): Promise<LoginResponseDto> {
    // Xác thực user bằng username/email và password
    const user = await this.validateUser(
      loginDto.usernameOrEmail,
      loginDto.password,
    );
    
    // Tạo JWT token và trả về cho client
    return this.login(user);
  }

  /**
   * Đăng ký user mới
   *
   * @param createUserDto - Dữ liệu user từ request body
   * @returns RegisterResponseDto - Thông tin user đã tạo và message thành công
   * @throws HttpException - Nếu có lỗi xảy ra
   */
  async register(createUserDto: CreateUsersDto): Promise<RegisterResponseDto> {
    try {
      // Gọi service để tạo user mới với mật khẩu đã mã hóa
      const user = await this.usersService.createUser(createUserDto);

      // Trả về response thành công với thông tin user
      return {
        message: 'User registered successfully',
        user,
      };
    } catch (error) {
      // ExceptionFilter sẽ tự động xử lý tất cả các lỗi
      throw error;
    }
  }
}
