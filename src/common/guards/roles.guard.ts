import {
  CanActivate,
  ExecutionContext,
  Injectable,
  Logger,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY, UserRole, hasRolePermission } from '@/common/constants/roles.constant';
import type { JwtUser } from '@/common/types/jwt-user.type';

/**
 * RolesGuard - Guard kiểm tra quyền truy cập dựa trên vai trò (role) của user
 *
 * Guard này sẽ:
 * 1. Lấy danh sách roles được yêu cầu từ decorator @Roles
 * 2. Kiểm tra xem user hiện tại có role phù hợp không
 * 3. Cho phép hoặc từ chối truy cập vào endpoint
 *
 * Guard này thường được sử dụng sau JwtAuthGuard để kiểm tra role
 * và trước SelfOrAdminGuard để kiểm tra quyền truy cập resource cụ thể
 */
@Injectable()
export class RolesGuard implements CanActivate {
  // Logger để ghi log các hoạt động của guard
  private readonly logger = new Logger(RolesGuard.name);

  // Inject Reflector service để đọc metadata từ decorators
  constructor(private reflector: Reflector) {}

  /**
   * Phương thức chính để kiểm tra quyền truy cập
   *
   * Quy trình kiểm tra:
   * 1. Lấy required roles từ @Roles decorator
   * 2. Kiểm tra user có tồn tại không
   * 3. So sánh user role với required roles
   * 4. Sử dụng role hierarchy để kiểm tra quyền
   *
   * @param ctx - ExecutionContext chứa thông tin về request hiện tại
   * @returns true nếu user có quyền truy cập, false nếu không
   * @throws ForbiddenException nếu user không có quyền truy cập
   */
  canActivate(ctx: ExecutionContext): boolean {
    // Lấy danh sách roles được yêu cầu từ decorator @Roles
    // getAllAndOverride sẽ tìm metadata từ cả method và class level
    // Ví dụ: @Roles(['admin']) ở method hoặc @Roles(['user']) ở class
    const requiredRoles = this.reflector.getAllAndOverride<UserRole[]>(
      ROLES_KEY, // Key để tìm metadata (được định nghĩa trong roles.constant.ts)
      [ctx.getHandler(), ctx.getClass()], // Tìm ở method level trước, sau đó class level
    );

    // Nếu route không khai báo @Roles -> pass qua (chỉ cần JwtAuthGuard bảo vệ)
    // Điều này có nghĩa là endpoint không yêu cầu role cụ thể nào
    // Chỉ cần user đã được xác thực (có JWT token hợp lệ)
    if (!requiredRoles || requiredRoles.length === 0) {
      this.logger.debug('No roles required for this endpoint');
      return true;
    }

    // Lấy thông tin user từ request (đã được JwtAuthGuard xác thực trước đó)
    // req.user chứa thông tin user được decode từ JWT token
    const request = ctx.switchToHttp().getRequest();
    const user = request.user as JwtUser;

    // Kiểm tra xem user có tồn tại không
    // Nếu không có user, có thể do JwtAuthGuard chưa chạy hoặc token invalid
    if (!user) {
      this.logger.warn('User not found in request context');
      throw new ForbiddenException('User not authenticated');
    }

    // Kiểm tra xem role của user có trong danh sách roles được yêu cầu không
    // Sử dụng hasRolePermission() để kiểm tra theo role hierarchy
    // Ví dụ: admin có thể thực hiện tất cả quyền của user
    const hasRequiredRole = requiredRoles.some((requiredRole) =>
      hasRolePermission(user.role, requiredRole),
    );

    // Nếu user không có role phù hợp
    if (!hasRequiredRole) {
      this.logger.warn(
        `User ${user.id} with role ${user.role} denied access. Required roles: ${requiredRoles.join(', ')}`,
      );
      throw new ForbiddenException(`Access denied. Required roles: ${requiredRoles.join(', ')}`);
    }

    // Nếu user có role phù hợp, cho phép truy cập
    this.logger.debug(`User ${user.id} with role ${user.role} granted access to endpoint`);
    return true;
  }
}
