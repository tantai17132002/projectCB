import { IsIn, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { ADMIN_ROLE, USER_ROLE } from '@/common/constants/roles.constant';
import type { UserRole } from '@/common/constants/roles.constant';

/**
 * UpdateRoleDto - DTO để cập nhật vai trò của user
 *
 * Sử dụng UserRole type và constants để đảm bảo tính nhất quán với hệ thống roles
 */
export class UpdateRoleDto {
  /**
   * Vai trò mới của user
   * @example "admin"
   * @example "user"
   */
  @ApiProperty({
    description: 'New role for the user',
    example: 'admin',
    required: true,
    enum: [USER_ROLE, ADMIN_ROLE],
  })
  @IsNotEmpty()
  @IsIn([USER_ROLE, ADMIN_ROLE], {
    message: `Role must be either '${USER_ROLE}' or '${ADMIN_ROLE}'`,
  })
  role: UserRole;
}
