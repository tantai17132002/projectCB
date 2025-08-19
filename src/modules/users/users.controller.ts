import {
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Body,
  UseGuards,
  Query,
} from '@nestjs/common';
import { UserService } from '@/modules/users/users.service';
import { Auth } from '@/common/decorators/auth.decorator';
import { SelfOrAdminGuard } from '@/common/guards/self-or-admin.guard';
import { RolesGuard } from '@/common/guards/roles.guard';
import { 
  ApiBearerAuth, 
  ApiTags, 
  ApiOperation, 
  ApiResponse, 
  ApiParam,
  ApiBody,
  ApiQuery
} from '@nestjs/swagger';
import { UpdateRoleDto } from '@/modules/users/dto/update-role.dto';
import { QueryUserDto } from '@/modules/users/dto/query-user.dto';
import { 
  UserResponseDto,
  UserListResponseDto
} from '@/modules/users/dto/user-response.dto';
import {
  UserPaginationResponseDto,
} from '@/modules/users/dto/user-pagination-response.dto';
import { 
  ErrorResponseDto,
  ValidationErrorResponseDto,
  UnauthorizedErrorResponseDto,
  ForbiddenErrorResponseDto,
  NotFoundErrorResponseDto
} from '@/common/dto/error-response.dto';

/**
 * UserController - Controller xử lý các request liên quan đến user
 *
 * Controller này chứa các endpoint để:
 * - Quản lý thông tin user
 * - Cập nhật role của user
 *
 * Các endpoint được bảo vệ bởi:
 * - JWT Authentication (thông qua @Auth decorator)
 * - Role-based Authorization (admin/user)
 * - Self-or-Admin Authorization (chỉ admin hoặc chính chủ mới truy cập được)
 */
@ApiTags('users') // Nhóm các API user trong Swagger docs
@ApiBearerAuth() // Thêm Bearer token vào Swagger docs
@Controller('users') // Base route: /users
export class UserController {
  constructor(private readonly userService: UserService) {}

  /**
   * GET /users - Lấy danh sách users với pagination
   *
   * Chỉ ADMIN mới có quyền truy cập endpoint này
   * Hỗ trợ pagination để tối ưu performance khi có nhiều users
   * 
   * @param query - Query parameters với pagination (page, limit)
   * @returns Promise<Object> - Danh sách users và metadata pagination
   *
   * @example
   * GET /users?page=1&limit=10
   */
  @ApiOperation({ 
    summary: 'Get all users with pagination (Admin only)',
    description: 'Retrieve users with pagination support. Only admins can access this endpoint.'
  })
  @ApiQuery({ 
    name: 'page', 
    description: 'Page number (min: 1)',
    example: 1,
    required: false
  })
  @ApiQuery({ 
    name: 'limit', 
    description: 'Items per page (min: 1, max: 100)',
    example: 10,
    required: false
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Users retrieved successfully with pagination',
    type: UserPaginationResponseDto
  })
  @ApiResponse({ 
    status: 400, 
    description: 'Bad request - Invalid query parameters',
    type: ValidationErrorResponseDto
  })
  @ApiResponse({ 
    status: 401, 
    description: 'Unauthorized',
    type: UnauthorizedErrorResponseDto
  })
  @ApiResponse({ 
    status: 403, 
    description: 'Forbidden - Admin access required',
    type: ForbiddenErrorResponseDto
  })
  @Auth('admin') // Chỉ admin mới có quyền xem danh sách toàn bộ user
  @Get()
  findAll(@Query() query: QueryUserDto) {
    return this.userService.findAll(query);
  }

  /**
   * GET /users/:id - Lấy thông tin một user cụ thể
   *
   * Quyền truy cập:
   * - ADMIN: có thể xem thông tin bất kỳ user nào
   * - USER: chỉ có thể xem thông tin của chính mình
   *
   * @param id - ID của user cần xem (từ URL params)
   * @returns Promise<UsersEntity> - Thông tin user
   */
  @ApiOperation({ summary: 'Get user by ID (Self or Admin only)' })
  @ApiParam({ name: 'id', description: 'User ID', example: 1 })
  @ApiResponse({ 
    status: 200, 
    description: 'User retrieved successfully',
    type: UserResponseDto
  })
  @ApiResponse({ 
    status: 401, 
    description: 'Unauthorized',
    type: UnauthorizedErrorResponseDto
  })
  @ApiResponse({ 
    status: 403, 
    description: 'Forbidden - Access denied',
    type: ForbiddenErrorResponseDto
  })
  @ApiResponse({ 
    status: 404, 
    description: 'User not found',
    type: NotFoundErrorResponseDto
  })
  @Auth() // Cần JWT authentication trước
  @UseGuards(RolesGuard, SelfOrAdminGuard) // Sau đó kiểm tra role và self-or-admin
  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    // ParseIntPipe - Tự động chuyển đổi string thành number và validate
    return this.userService.findById(id);
  }

  /**
   * PATCH /users/:id/role - Cập nhật role của user
   *
   * Chỉ ADMIN mới có quyền thay đổi role của user khác
   *
   * @param id - ID của user cần thay đổi role
   * @param dto - DTO chứa role mới (UpdateRoleDto)
   * @returns Promise<UsersEntity> - User đã được cập nhật role
   *
   * @example
   * PATCH /users/123/role
   * Body: { "role": "admin" }
   */
  @ApiOperation({ summary: 'Update user role (Admin only)' })
  @ApiParam({ name: 'id', description: 'User ID', example: 1 })
  @ApiBody({ type: UpdateRoleDto })
  @ApiResponse({ 
    status: 200, 
    description: 'User role updated successfully',
    type: UserResponseDto
  })
  @ApiResponse({ 
    status: 400, 
    description: 'Bad request - Invalid role',
    type: ValidationErrorResponseDto
  })
  @ApiResponse({ 
    status: 401, 
    description: 'Unauthorized',
    type: UnauthorizedErrorResponseDto
  })
  @ApiResponse({ 
    status: 403, 
    description: 'Forbidden - Admin access required',
    type: ForbiddenErrorResponseDto
  })
  @ApiResponse({ 
    status: 404, 
    description: 'User not found',
    type: NotFoundErrorResponseDto
  })
  @Auth('admin') // Chỉ admin mới có quyền đổi role user
  @Patch(':id/role')
  updateRole(
    @Param('id', ParseIntPipe) id: number, // ID từ URL params
    @Body() dto: UpdateRoleDto, // Role mới từ request body
  ) {
    return this.userService.updateRole(id, dto);
  }
}
