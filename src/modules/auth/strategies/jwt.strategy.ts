import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';

/**
 * JwtStrategy - Chiến lược xác thực bằng JWT Token
 *
 * Strategy này chịu trách nhiệm:
 * - Trích xuất JWT token từ request header
 * - Verify và decode JWT token
 * - Trả về thông tin user từ payload của token
 * - Được sử dụng bởi Passport để bảo vệ các route cần xác thực
 */
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(config: ConfigService) {
    super({
      // Cách trích xuất JWT token từ request
      // Từ header Authorization: Bearer <token>
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),

      // Secret key để verify JWT token (lấy từ biến môi trường)
      secretOrKey: config.get('JWT_SECRET') as string,
    });
  }

  /**
   * Validate và trả về thông tin user từ JWT payload
   *
   * @param payload - Payload đã được decode từ JWT token
   * @returns Object chứa thông tin user (id, username, role)
   *
   * @example
   * // Khi gọi @UseGuards(JwtAuthGuard) trên controller
   * // Method này sẽ được tự động gọi để validate token
   * // Và trả về user object cho request
   */
  async validate(payload: any) {
    // Trả về object chứa thông tin user từ JWT payload
    // Object này sẽ được inject vào request.user
    return {
      id: payload.sub, // ID user (subject từ JWT)
      username: payload.username, // Tên đăng nhập
      role: payload.role, // Vai trò của user
    };
  }
}
