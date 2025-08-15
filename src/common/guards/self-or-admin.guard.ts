import { CanActivate, ExecutionContext, Injectable, Logger, ForbiddenException, BadRequestException } from '@nestjs/common';
import { Request } from 'express';
import { ADMIN_ROLE } from '@/common/constants/roles.constant';
import type { JwtUser } from '@/common/types/jwt-user.type';

/**
 * SelfOrAdminGuard - Guard kiểm tra quyền truy cập dựa trên "chính mình hoặc admin"
 *
 * Logic của guard này:
 * 1. Nếu user là admin -> cho phép truy cập bất kỳ tài nguyên nào
 * 2. Nếu user không phải admin -> chỉ cho phép truy cập tài nguyên của chính mình
 *
 * Ví dụ sử dụng:
 * - GET /users/123 - User có id=123 hoặc admin có thể truy cập
 * - PUT /users/123 - User có id=123 hoặc admin có thể cập nhật
 * - DELETE /users/123 - User có id=123 hoặc admin có thể xóa
 * 
 * Guard này thường được sử dụng sau JwtAuthGuard và RolesGuard
 * để đảm bảo user chỉ có thể truy cập resource của chính mình
 */
@Injectable()
export class SelfOrAdminGuard implements CanActivate {
  // Logger để ghi log các hoạt động của guard
  private readonly logger = new Logger(SelfOrAdminGuard.name);

  /**
   * Phương thức kiểm tra quyền truy cập
   * 
   * Quy trình kiểm tra:
   * 1. Lấy thông tin user từ request context
   * 2. Validate ID parameter từ URL
   * 3. Kiểm tra quyền truy cập theo logic self-or-admin
   * 4. Trả về true/false hoặc throw exception
   * 
   * @param ctx - ExecutionContext chứa thông tin request
   * @returns true nếu user có quyền truy cập, false nếu không
   * @throws ForbiddenException nếu user không có quyền truy cập
   * @throws BadRequestException nếu ID không hợp lệ
   */
  canActivate(ctx: ExecutionContext): boolean {
    // Lấy request object từ HTTP context
    // switchToHttp() chuyển đổi context sang HTTP context
    // getRequest() lấy request object từ HTTP context
    const req = ctx.switchToHttp().getRequest<Request>();

    // Lấy thông tin user từ request (đã được JwtAuthGuard xác thực trước đó)
    // req.user chứa thông tin user được decode từ JWT token
    const user = req.user as JwtUser;

    // Kiểm tra xem user có tồn tại không
    // Nếu không có user, có thể do JwtAuthGuard chưa chạy hoặc token invalid
    if (!user) {
      this.logger.warn('User not found in request context');
      throw new ForbiddenException('User not authenticated');
    }

    // Lấy ID từ URL params và chuyển thành number
    // Ví dụ: /users/123 -> req.params.id = "123" -> paramId = 123
    const paramId = Number(req.params.id);

    // Validate ID parameter để đảm bảo tính hợp lệ
    // Kiểm tra: không phải NaN, > 0, và là integer
    if (isNaN(paramId) || paramId <= 0 || !Number.isInteger(paramId)) {
      this.logger.warn(`Invalid user ID: ${req.params.id}`);
      throw new BadRequestException('Invalid user ID. Must be a positive integer.');
    }

    // Logic kiểm tra quyền truy cập:
    // 1. Nếu user là admin -> cho phép truy cập bất kỳ resource nào
    // Admin có quyền truy cập tất cả resources trong hệ thống
    if (user.role === ADMIN_ROLE) {
      this.logger.debug(
        `Admin user ${user.id} granted access to resource ${paramId}`
      );
      return true;
    }

    // 2. Nếu user không phải admin -> chỉ cho phép truy cập resource của chính mình
    // So sánh ID của user hiện tại với ID trong URL params
    // Ví dụ: user.id = 123, paramId = 123 -> isSelfAccess = true
    const isSelfAccess = user.id === paramId;

    if (isSelfAccess) {
      this.logger.debug(
        `User ${user.id} granted access to their own resource`
      );
      return true;
    }

    // Nếu không phải admin và không phải resource của chính mình
    // Log warning và throw ForbiddenException
    this.logger.warn(
      `User ${user.id} denied access to resource ${paramId}. Self-access only.`
    );
    throw new ForbiddenException(
      'Access denied. You can only access your own resources.'
    );
  }
}
