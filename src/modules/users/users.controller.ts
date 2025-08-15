import {
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Body,
  UseGuards,
} from '@nestjs/common';
import { UserService } from '@/modules/users/users.service';
import { Auth } from '@/common/decorators/auth.decorator';
import { SelfOrAdminGuard } from '@/common/guards/self-or-admin.guard';
import { RolesGuard } from '@/common/guards/roles.guard';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { UpdateRoleDto } from '@/modules/users/dto/update-role.dto';

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
   * GET /users - Lấy danh sách tất cả users
   *
   * Chỉ ADMIN mới có quyền truy cập endpoint này
   * @Auth('admin') - Yêu cầu JWT + role admin
   *
   * @returns Promise<UsersEntity[]> - Danh sách tất cả users
   */
  @Auth('admin') // Chỉ admin mới có quyền xem danh sách toàn bộ user
  @Get()
  findAll() {
    return this.userService.findAll();
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
  @Auth('admin') // Chỉ admin mới có quyền đổi role user
  @Patch(':id/role')
  updateRole(
    @Param('id', ParseIntPipe) id: number, // ID từ URL params
    @Body() dto: UpdateRoleDto, // Role mới từ request body
  ) {
    return this.userService.updateRole(id, dto);
  }
}
