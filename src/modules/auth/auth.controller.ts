// Import các decorator và module cần thiết từ NestJS
import {
  Body,
  Controller,
  Post,
  HttpException,
  HttpStatus,
  Get,
  Request,
  UseGuards,
} from '@nestjs/common';
import { CreateUsersDto } from '@/modules/users/dto/create-users.dto';
import { UserService } from '@/modules/users/users.service';
import { LoginDto } from '@/modules/auth/dto/login.dto';
import { AuthService } from '@/modules/auth/auth.service';
import { JwtAuthGuard } from '@/modules/auth/guards/jwt-auth.guard';
import { CurrentUser } from '@/modules/auth/decorators/current-user.decorator';
import { 
  ApiTags, 
  ApiOperation, 
  ApiResponse, 
  ApiBearerAuth,
  ApiBody 
} from '@nestjs/swagger';

// import { CurrentUser } from '@/modules/auth/decorators/current-user.decorator';
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
@ApiTags('Authentication')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly userService: UserService,
    private readonly authService: AuthService,
  ) {}

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
  @ApiOperation({ summary: 'Register new user' })
  @ApiBody({ type: CreateUsersDto })
  @ApiResponse({ 
    status: 201, 
    description: 'User registered successfully',
    schema: {
      type: 'object',
      properties: {
        message: { type: 'string', example: 'User registered successfully' },
        user: {
          type: 'object',
          properties: {
            id: { type: 'number', example: 1 },
            username: { type: 'string', example: 'john_doe' },
            email: { type: 'string', example: 'john@example.com' },
            role: { type: 'string', example: 'user' }
          }
        }
      }
    }
  })
  @ApiResponse({ status: 409, description: 'Username or email already exists' })
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
      if (error.code === '23505') {
        // Lỗi ràng buộc duy nhất của PostgreSQL
        throw new HttpException(
          'Username or email already exists',
          HttpStatus.CONFLICT,
        );
      }

      // Xử lý các lỗi khác
      throw new HttpException(
        'Internal server error',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Endpoint đăng nhập user
   * 
   * @param dto - Dữ liệu đăng nhập từ request body (usernameOrEmail, password)
   * @returns Object chứa JWT access token
   * 
   * @example
   * // Request: POST /auth/login
   * // Body (đăng nhập bằng username):
   * {
   *   "usernameOrEmail": "john_doe",
   *   "password": "password123"
   * }
   * 
   * // Body (đăng nhập bằng email):
   * {
   *   "usernameOrEmail": "john@example.com",
   *   "password": "password123"
   * }
   * 
   * // Response:
   * {
   *   "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
   * }
   */
  @ApiOperation({ summary: 'Đăng nhập user' })
  @ApiBody({ type: LoginDto })
  @ApiResponse({ 
    status: 200, 
    description: 'Đăng nhập thành công',
    schema: {
      type: 'object',
      properties: {
        access_token: { 
          type: 'string', 
          example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOjEsInVzZXJuYW1lIjoiam9obl9kb2UiLCJyb2xlIjoidXNlciIsImlhdCI6MTYzNjQ5NjAwMCwiZXhwIjoxNjM2NTgyNDAwfQ.example' 
        }
      }
    }
  })
  @ApiResponse({ status: 401, description: 'Thông tin đăng nhập không chính xác' })
  @Post('login')
  async login(@Body() dto: LoginDto) {
    // Xác thực user bằng username/email và password
    const user = await this.authService.validateUser(
      dto.usernameOrEmail,
      dto.password,
    );
    
    // Tạo JWT token và trả về cho client
    return this.authService.login(user);
  }

  /**
   * Endpoint lấy thông tin user hiện tại (cần xác thực)
   * 
   * @param user - Thông tin user từ JWT token (được inject bởi CurrentUser decorator)
   * @returns Thông tin user hiện tại
   * 
   * @example
   * // Request: GET /auth/me
   * // Headers: Authorization: Bearer <jwt_token>
   * 
   * // Response:
   * {
   *   "id": 1,
   *   "username": "john_doe",
   *   "role": "user"
   * }
   */
  @ApiOperation({ summary: 'Get current user information' })
  @ApiBearerAuth()
  @ApiResponse({ 
    status: 200, 
    description: 'Current user information',
    schema: {
      type: 'object',
      properties: {
        id: { type: 'number', example: 1 },
        username: { type: 'string', example: 'john_doe' },
        email: { type: 'string', example: 'john@example.com' },
        role: { type: 'string', example: 'user' }
      }
    }
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @UseGuards(JwtAuthGuard) // Bảo vệ endpoint bằng JWT authentication
  @Get('me')
  getMe(@CurrentUser() user: any) {
    // Trả về thông tin user từ JWT token
    return user;
  }
}
