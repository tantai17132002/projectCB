// Import các decorator cần thiết từ TypeORM và class-transformer
import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';
import { Exclude } from 'class-transformer';

/**
 * User Entity - Đại diện cho bảng users trong database
 *
 * Entity này định nghĩa cấu trúc dữ liệu của user trong hệ thống
 * Sử dụng TypeORM decorators để mapping với database
 */
@Entity('users') // Tên bảng trong database (nên dùng số nhiều)
export class UsersEntity {
  /**
   * ID của users - Tự động tăng (auto increment)
   * Đây là primary key của bảng users
   */
  @PrimaryGeneratedColumn()
  id: number;

  /**
   * Tên đăng nhập của users
   * unique: true = đảm bảo username không bị trùng lặp
   * nullable: false = bắt buộc phải có giá trị (tương đương required)
   */
  @Column({ unique: true, nullable: false })
  username: string;

  /**
   * Email của users
   * Dùng để đăng nhập và liên lạc
   * unique: true = đảm bảo email không bị trùng lặp
   */
  @Column({ unique: true, nullable: false })
  email: string;

  /**
   * Mật khẩu đã được mã hóa của users
   * @Exclude() = ẩn field này khi trả về dữ liệu cho client
   * Đảm bảo bảo mật - không bao giờ trả password về frontend
   */
  @Column({ nullable: false })
  @Exclude() // Ẩn khi trả dữ liệu
  password: string;

  /**
   * Vai trò của users trong hệ thống
   * default: 'user' = mặc định là user thường
   * 'user' | 'admin' = chỉ cho phép 2 giá trị này
   */
  @Column({ default: 'user' })
  role: 'user' | 'admin';
}
