import { CreateDateColumn, UpdateDateColumn } from 'typeorm';

/**
 * BaseEntity - Class cơ sở chứa các trường timestamp chung
 *
 * Class này định nghĩa các trường thời gian tạo và cập nhật
 * Có thể được extends bởi các entity khác để tái sử dụng
 */
export abstract class BaseEntity {
  /**
   * Thời gian tạo record
   * Tự động được set khi tạo record mới
   * @CreateDateColumn() = TypeORM tự động quản lý
   */
  @CreateDateColumn()
  createdAt: Date;

  /**
   * Thời gian cập nhật record lần cuối
   * Tự động được cập nhật mỗi khi record thay đổi
   */
  @UpdateDateColumn()
  updatedAt: Date;
}
