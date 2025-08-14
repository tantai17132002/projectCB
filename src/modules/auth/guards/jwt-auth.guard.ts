import { AuthGuard } from '@nestjs/passport';
import { Injectable } from '@nestjs/common';

/**
 * JwtAuthGuard - Guard bảo vệ route bằng JWT Authentication
 * 
 * Guard này chịu trách nhiệm:
 * - Bảo vệ các API endpoint cần xác thực
 * - Tự động validate JWT token trong request
 * - Chặn request nếu không có token hoặc token không hợp lệ
 * - Cho phép request đi qua nếu token hợp lệ
 * 
 * @example
 * // Sử dụng trên controller method:
 * @UseGuards(JwtAuthGuard)
 * @Get('profile')
 * getProfile(@Request() req) {
 *   return req.user; // Thông tin user từ JWT token
 * }
 * 
 * // Hoặc sử dụng trên toàn bộ controller:
 * @Controller('protected')
 * @UseGuards(JwtAuthGuard)
 * export class ProtectedController {
 *   // Tất cả methods trong controller này đều cần JWT token
 * }
 */
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {}