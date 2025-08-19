import { IsBooleanString, IsInt, IsOptional, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

/**
 * DTO cho việc truy vấn danh sách todos
 * Sử dụng để xác thực và chuyển đổi các tham số truy vấn từ request
 */
export class QueryTodoDto {
  /**
   * Trang hiện tại (pagination)
   * @Type(() => Number) - Chuyển đổi string từ truy vấn thành number
   * @IsInt() - Validate phải là số nguyên
   * @Min(1) - Giá trị tối thiểu là 1
   * @IsOptional() - Trường này không bắt buộc
   * = 1 - Giá trị mặc định là trang 1
   */
  @ApiProperty({
    description: 'Page number for pagination',
    example: 1,
    required: false,
    default: 1,
    minimum: 1
  })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  page?: number = 1;

  /**
   * Số lượng items trên mỗi trang (pagination)
   * = 10 - Giá trị mặc định là 10 items/trang
   */
  @ApiProperty({
    description: 'Number of items per page',
    example: 10,
    required: false,
    default: 10,
    minimum: 1
  })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  limit?: number = 10;

  /**
   * Filter theo trạng thái hoàn thành của todo
   * @IsBooleanString() - Validate phải là string "true" hoặc "false"
   * Ví dụ: ?isDone=true hoặc ?isDone=false
   * Lưu ý: Query params luôn là string, nên cần dùng IsBooleanString thay vì IsBoolean
   */
  @ApiProperty({
    description: 'Filter todos by completion status',
    example: 'true',
    required: false,
    enum: ['true', 'false']
  })
  @IsBooleanString()
  @IsOptional()
  isDone?: string;
}
