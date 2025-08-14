// Import các decorator và module cần thiết từ NestJS
import {
  Body,
  Controller,
  Post,
  Get,
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
import { 
  RegisterResponseDto, 
  LoginResponseDto, 
  UserResponseDto 
} from '@/modules/auth/dto/auth-response.dto';

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
    type: RegisterResponseDto
  })
  @ApiResponse({ status: 409, description: 'Username or email already exists' })
  @Post('register')
  async register(@Body() createUserDto: CreateUsersDto) {
    return this.authService.register(createUserDto);
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
  @ApiOperation({ summary: 'Login user' })
  @ApiBody({ type: LoginDto })
  @ApiResponse({ 
    status: 200, 
    description: 'Login successfully',
    type: LoginResponseDto
  })
  @ApiResponse({ status: 401, description: 'Login failed' })
  @Post('login')
  async login(@Body() dto: LoginDto) {
    return this.authService.processLogin(dto);
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
    type: UserResponseDto
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @UseGuards(JwtAuthGuard) // Bảo vệ endpoint bằng JWT authentication
  @Get('me')
  getMe(@CurrentUser() user: any) {
    // Trả về thông tin user từ JWT token
    return user;
  }
}
