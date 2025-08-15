import { IsBoolean, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

/**
 * CreateTodoDto - Data Transfer Object cho việc tạo todo mới
 *
 * DTO này định nghĩa cấu trúc dữ liệu và validation rules
 * khi client gửi request tạo todo mới
 *
 * @example
 * // Request body khi tạo todo
 * {
 *   "title": "Học TypeScript",
 *   "description": "Ôn lại các khái niệm cơ bản",
 *   "isDone": false
 * }
 */
export class CreateTodoDto {
  /**
   * Tiêu đề của todo
   * @IsString() = phải là chuỗi
   * @IsNotEmpty() = không được để trống
   * Validation: Bắt buộc phải có giá trị và phải là string
   */
  @ApiProperty({
    description: 'title todo',
    example: 'Learn TypeScript',
    required: true,
  })
  @IsString()
  @IsNotEmpty()
  title: string;

  /**
   * Mô tả chi tiết của todo (tùy chọn)
   * @IsOptional() = có thể để trống
   * Validation: Nếu có thì phải là string
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
   * Trạng thái hoàn thành của todo (tùy chọn)
   * @IsBoolean() = phải là boolean
   * Validation: Nếu có thì phải là true hoặc false
   * Mặc định sẽ là false khi tạo todo mới
   */
  @ApiProperty({
    description: 'Status of the todo',
    example: false,
    required: false,
    default: false,
  })
  @IsBoolean()
  @IsOptional()
  isDone?: boolean;
}
