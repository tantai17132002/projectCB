import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, Min, Max, IsInt } from 'class-validator';
import { Type } from 'class-transformer';

/**
 * PaginationMetaDto - DTO chung cho metadata pagination
 * Có thể tái sử dụng cho tất cả các module
 */
export class PaginationMetaDto {
  @ApiProperty({
    description: 'Current page number',
    example: 1,
  })
  page: number;

  @ApiProperty({
    description: 'Number of items per page',
    example: 10,
  })
  limit: number;

  @ApiProperty({
    description: 'Total number of items',
    example: 25,
  })
  total: number;

  @ApiProperty({
    description: 'Total number of pages',
    example: 3,
  })
  totalPages: number;

  @ApiProperty({
    description: 'Whether there is a next page',
    example: true,
  })
  hasNextPage: boolean;

  @ApiProperty({
    description: 'Whether there is a previous page',
    example: false,
  })
  hasPrevPage: boolean;
}

/**
 * BaseQueryDto - DTO cơ bản cho query parameters với pagination
 * Có thể extend để thêm filtering và sorting cho từng module
 */
export class BaseQueryDto {
  @ApiProperty({
    description: 'Page number for pagination (min: 1)',
    example: 1,
    required: false,
    default: 1,
    minimum: 1,
  })
  @Type(() => Number)
  @IsOptional()
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiProperty({
    description: 'Number of items per page (min: 1, max: 100)',
    example: 10,
    required: false,
    default: 10,
    minimum: 1,
  })
  @Type(() => Number)
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 10;
}
