/**
 * JwtPayload - Type definition cho payload của JWT token
 *
 * Type này định nghĩa cấu trúc dữ liệu được encode trong JWT token
 * và được decode khi validate token
 */
export type JwtPayload = {
  sub: number; // Subject (user ID)
  username: string; // Username
  role: 'user' | 'admin'; // User role
  iat?: number; // Issued at (timestamp)
  exp?: number; // Expiration time (timestamp)
};
