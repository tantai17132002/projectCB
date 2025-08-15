/**
 * JwtUser - Type definition cho thông tin user từ JWT token
 * 
 * Type này được sử dụng để định nghĩa cấu trúc dữ liệu user
 * được trích xuất từ JWT payload sau khi validate token
 */
export type JwtUser = {
  id: number;
  username: string;
  role: 'user' | 'admin';
};
