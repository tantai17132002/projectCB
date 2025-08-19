import { ApiProperty } from '@nestjs/swagger';

/**
 * TodoResponseDto - DTO cho response của todo
 */
export class TodoResponseDto {
  @ApiProperty({
    description: 'Todo ID',
    example: 1
  })
  id: number;

  @ApiProperty({
    description: 'Todo title',
    example: 'Learn TypeScript'
  })
  title: string;

  @ApiProperty({
    description: 'Todo description',
    example: 'Review the basics of TypeScript',
    required: false
  })
  description?: string;

  @ApiProperty({
    description: 'Todo completion status',
    example: false
  })
  isDone: boolean;

  @ApiProperty({
    description: 'User ID who owns this todo',
    example: 1
  })
  ownerId: number;

  @ApiProperty({
    description: 'Todo creation date',
    example: '2024-01-15T10:30:00.000Z'
  })
  createdAt: Date;

  @ApiProperty({
    description: 'Todo last update date',
    example: '2024-01-15T10:30:00.000Z'
  })
  updatedAt: Date;
}

/**
 * TodoListResponseDto - DTO cho response danh sách todos với pagination
 */
export class TodoListResponseDto {
  @ApiProperty({
    description: 'List of todos',
    type: [TodoResponseDto]
  })
  todos: TodoResponseDto[];

  @ApiProperty({
    description: 'Total number of todos',
    example: 25
  })
  total: number;

  @ApiProperty({
    description: 'Current page number',
    example: 1
  })
  page: number;

  @ApiProperty({
    description: 'Number of items per page',
    example: 10
  })
  limit: number;

  @ApiProperty({
    description: 'Total number of pages',
    example: 3
  })
  totalPages: number;
}
