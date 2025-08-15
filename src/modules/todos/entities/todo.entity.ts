import {
  Column,
  Entity,
  Index,
  ManyToOne,
  PrimaryGeneratedColumn,
  JoinColumn,
} from 'typeorm';
import { UsersEntity } from '@/modules/users/entity/users.entity';
import { BaseEntity } from '@/common/entities/base.entity';

/**
 * TodoEntity - Đại diện cho bảng todos trong database
 *
 * Entity này định nghĩa cấu trúc dữ liệu của todo item trong hệ thống
 * Mỗi todo thuộc về một user cụ thể (quan hệ Many-to-One)
 * Extends từ BaseEntity để có các trường timestamp chung
 */
@Entity('todos') // Tên bảng trong database
export class TodoEntity extends BaseEntity {
  /**
   * ID của todo - Tự động tăng (auto increment)
   * Đây là primary key của bảng todos
   */
  @PrimaryGeneratedColumn()
  id: number;

  /**
   * Tiêu đề của todo
   * nullable: false = bắt buộc phải có giá trị
   */
  @Column()
  title: string;

  /**
   * Mô tả chi tiết của todo (tùy chọn)
   * nullable: true = có thể để trống
   */
  @Column({ nullable: true })
  description?: string;

  /**
   * Trạng thái hoàn thành của todo
   * default: false = mặc định là chưa hoàn thành
   * true = đã hoàn thành, false = chưa hoàn thành
   */
  @Column({ default: false })
  isDone: boolean;

  /**
   * ID của user sở hữu todo này
   * @Index() = tạo index để query nhanh hơn
   * Dùng để kiểm tra quyền truy cập và lọc todos theo user
   */
  @Index()
  @Column()
  ownerId: number;

  /**
   * Quan hệ Many-to-One với UsersEntity
   * Mỗi todo thuộc về một user duy nhất
   * onDelete: 'CASCADE' = khi xóa user thì tự động xóa luôn todos của user đó
   * (user) => user.todos = tham chiếu ngược về danh sách todos của user
   * @JoinColumn({ name: 'ownerId' }) = để join với bảng users
   */
  @ManyToOne(() => UsersEntity, (user) => user.todos, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'ownerId' })
  owner: UsersEntity;
}
