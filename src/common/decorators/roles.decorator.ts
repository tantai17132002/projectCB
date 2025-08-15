import { SetMetadata } from '@nestjs/common';
import { ROLES_KEY, UserRole } from '@/common/constants/roles.constant';

/**
 * Roles Decorator - Decorator để kiểm tra vai trò người dùng
 *
 * Decorator này được sử dụng để đánh dấu các endpoint cần kiểm tra vai trò
 * trước khi cho phép truy cập. Nó lưu trữ thông tin vai trò cần thiết
 * vào metadata của method để guard có thể kiểm tra sau.
 *
 * @param roles - Danh sách các vai trò được phép truy cập endpoint
 * @returns Decorator function với metadata chứa thông tin vai trò
 *
 * @example
 * // Chỉ admin mới truy cập được
 * @Roles('admin')
 * @Get('admin-only')
 * adminOnly() { ... }
 *
 * // Cả user và admin đều truy cập được
 * @Roles('user', 'admin')
 * @Get('public')
 * public() { ... }
 *
 * // Sử dụng kết hợp với guard
 * @UseGuards(JwtAuthGuard, RolesGuard)
 * @Roles('admin')
 * @Get('protected')
 * protected() { ... }
 */
// Tạo decorator Roles: nhận danh sách vai trò và lưu vào metadata để guard kiểm tra sau
export const Roles = (...roles: UserRole[]) => SetMetadata(ROLES_KEY, roles);
