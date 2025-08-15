/**
 * Roles Constants - Các hằng số và kiểu dữ liệu cho vai trò người dùng
 *
 * File này định nghĩa các vai trò (roles) có thể có trong hệ thống
 * và các hằng số liên quan đến việc quản lý quyền truy cập
 */

/**
 * Role Constants - Các hằng số cho vai trò cụ thể
 * Tránh magic strings trong code
 */
export const ADMIN_ROLE = 'admin' as const;
export const USER_ROLE = 'user' as const;

/**
 * UserRole - Kiểu dữ liệu cho vai trò người dùng
 *
 * Định nghĩa các vai trò có thể có trong hệ thống:
 * - 'user': Người dùng thông thường, có quyền truy cập cơ bản
 * - 'admin': Quản trị viên, có quyền truy cập toàn bộ hệ thống
 */
export type UserRole = typeof ADMIN_ROLE | typeof USER_ROLE;

/**
 * ROLES_KEY - Khóa metadata cho decorator @Roles()
 *
 * Hằng số này được sử dụng để lưu trữ thông tin vai trò
 * trong metadata của controller/method khi sử dụng @Roles() decorator
 *
 * @example
 * // Sử dụng trong decorator:
 * SetMetadata(ROLES_KEY, ['admin'])
 *
 * // Sử dụng trong guard để kiểm tra:
 * const requiredRoles = Reflect.getMetadata(ROLES_KEY, context.getHandler());
 */
export const ROLES_KEY = 'roles';

/**
 * Role Hierarchy - Thứ tự ưu tiên của roles
 * Role cao hơn có thể thực hiện tất cả quyền của role thấp hơn
 */
export const ROLE_HIERARCHY = {
  [USER_ROLE]: 1,
  [ADMIN_ROLE]: 2,
} as const;

/**
 * Kiểm tra xem role có quyền cao hơn hoặc bằng role khác không
 * @param userRole - Role của user hiện tại
 * @param requiredRole - Role được yêu cầu
 * @returns true nếu user có đủ quyền
 */
export function hasRolePermission(userRole: UserRole, requiredRole: UserRole): boolean {
  return ROLE_HIERARCHY[userRole] >= ROLE_HIERARCHY[requiredRole];
}
