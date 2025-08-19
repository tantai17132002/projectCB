import { IsBooleanString, IsOptional, IsString, IsIn, IsDateString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { BaseQueryDto } from '@/common/dto/pagination.dto';

/**
 * DTO cho việc truy vấn danh sách todos với pagination, filtering và sorting
 * 
 * Extends từ BaseQueryDto để có pagination cơ bản
 * Thêm các tính năng filtering và sorting đặc thù cho todos
 * 
 * @example
 * GET /todos?page=1&limit=10&isDone=true&search=typescript&sortBy=createdAt&sortOrder=desc
 */
export class QueryTodoDto extends BaseQueryDto {

  // ===== FILTERING =====
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

  /**
   * Tìm kiếm theo title hoặc description
   * Hỗ trợ tìm kiếm text không phân biệt hoa thường
   */
  @ApiProperty({
    description: 'Search todos by title or description (case-insensitive)',
    example: 'typescript',
    required: false
  })
  @IsString()
  @IsOptional()
  search?: string;

  /**
   * Filter theo ngày tạo từ (ISO date string)
   */
  @ApiProperty({
    description: 'Filter todos created from this date (ISO format)',
    example: '2024-01-01T00:00:00.000Z',
    required: false
  })
  @IsDateString()
  @IsOptional()
  dateFrom?: string;

  /**
   * Filter theo ngày tạo đến (ISO date string)
   */
  @ApiProperty({
    description: 'Filter todos created until this date (ISO format)',
    example: '2024-12-31T23:59:59.999Z',
    required: false
  })
  @IsDateString()
  @IsOptional()
  dateTo?: string;

  // ===== SORTING =====
  /**
   * Sắp xếp theo trường nào
   */
  @ApiProperty({
    description: 'Sort by field',
    example: 'createdAt',
    required: false,
    enum: ['id', 'title', 'isDone', 'createdAt', 'updatedAt']
  })
  @IsIn(['id', 'title', 'isDone', 'createdAt', 'updatedAt'])
  @IsOptional()
  sortBy?: string = 'createdAt';

  /**
   * Thứ tự sắp xếp (asc/desc)
   */
  @ApiProperty({
    description: 'Sort order',
    example: 'desc',
    required: false,
    enum: ['asc', 'desc'],
    default: 'desc'
  })
  @IsIn(['asc', 'desc'])
  @IsOptional()
  sortOrder?: 'asc' | 'desc' = 'desc';
}
