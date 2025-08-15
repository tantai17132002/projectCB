import { IsBoolean, IsOptional, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

/**
 * UpdateTodoDto - Data Transfer Object cho việc cập nhật todo
 *
 * DTO này định nghĩa cấu trúc dữ liệu và validation rules
 * khi client gửi request cập nhật todo
 * Tất cả các trường đều là tùy chọn (optional) vì chỉ cập nhật những gì cần thiết
 *
 * @example
 * // Request body khi cập nhật todo (có thể chỉ gửi một số trường)
 * {
 *   "title": "Học TypeScript nâng cao",
 *   "isDone": true
 * }
 *
 * // Hoặc chỉ cập nhật trạng thái
 * {
 *   "isDone": true
 * }
 */
export class UpdateTodoDto {
  /**
   * Tiêu đề mới của todo (tùy chọn)
   * @IsString() = phải là chuỗi nếu có giá trị
   * @IsOptional() = có thể để trống, không bắt buộc cập nhật
   * Validation: Nếu có thì phải là string
   */
  @ApiProperty({
    description: 'Todo new topic (optional)',
    example: 'Learn Advanced TypeScript',
    required: false,
  })
  @IsString()
  @IsOptional()
  title?: string;

  /**
   * Mô tả chi tiết mới của todo (tùy chọn)
   */
  @ApiProperty({
    description: 'Detailed description of the todo (optional)',
    example: 'Review the basics of TypeScript',
    required: false,
  })
  @IsString()
  @IsOptional()
  description?: string;

  /**
   * Trạng thái hoàn thành mới của todo (tùy chọn)
   * @IsBoolean() = phải là boolean nếu có giá trị
   * Validation: Nếu có thì phải là true hoặc false
   */
  @ApiProperty({
    description: 'New completion status of todo (optional)',
    example: true,
    required: false,
  })
  @IsBoolean()
  @IsOptional()
  isDone?: boolean;
}
