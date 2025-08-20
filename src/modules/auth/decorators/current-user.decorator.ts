import { createParamDecorator, ExecutionContext } from '@nestjs/common';

/**
 * CurrentUser - Custom Parameter Decorator để lấy thông tin user hiện tại
 *
 * Decorator này được sử dụng để trích xuất thông tin user từ request
 * Thông tin user được inject bởi JwtAuthGuard sau khi validate JWT token
 *
 * @example
 * // Sử dụng trong controller:
 * @UseGuards(JwtAuthGuard)
 * @Get('profile')
 * getProfile(@CurrentUser() user) {
 *   // user sẽ chứa thông tin từ JWT payload: { id, username, role }
 *   return user;
 * }
 *
 * // Hoặc với destructuring:
 * @Get('profile')
 * getProfile(@CurrentUser() { id, username, role }) {
 *   return { id, username, role };
 * }
 */
export const CurrentUser = createParamDecorator((data: unknown, ctx: ExecutionContext) => {
  // Lấy request object từ execution context
  const request = ctx.switchToHttp().getRequest();

  // Trả về thông tin user đã được inject bởi JwtAuthGuard
  // request.user chứa thông tin từ JWT payload: { id, username, role }
  return request.user;
});
