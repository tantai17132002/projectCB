import { ApiProperty } from '@nestjs/swagger';

/**
 * ErrorResponseDto - DTO chung cho các error responses
 */
export class ErrorResponseDto {
  @ApiProperty({
    description: 'HTTP status code',
    example: 400,
  })
  statusCode: number;

  @ApiProperty({
    description: 'Error message',
    example: 'Bad Request',
  })
  message: string;

  @ApiProperty({
    description: 'Error details (optional)',
    example: 'Validation failed',
    required: false,
  })
  error?: string;

  @ApiProperty({
    description: 'Timestamp when error occurred',
    example: '2024-01-15T10:30:00.000Z',
  })
  timestamp: string;

  @ApiProperty({
    description: 'Request path',
    example: '/api/todos',
  })
  path: string;
}

/**
 * ValidationErrorResponseDto - DTO cho validation errors
 */
export class ValidationErrorResponseDto extends ErrorResponseDto {
  @ApiProperty({
    description: 'Validation error details',
    example: [
      {
        field: 'title',
        message: 'Title is required',
      },
    ],
    type: 'array',
  })
  errors: Array<{
    field: string;
    message: string;
  }>;
}

/**
 * UnauthorizedErrorResponseDto - DTO cho 401 errors
 */
export class UnauthorizedErrorResponseDto extends ErrorResponseDto {
  @ApiProperty({
    description: 'Error message for unauthorized access',
    example: 'Unauthorized',
  })
  declare message: string;
}

/**
 * ForbiddenErrorResponseDto - DTO cho 403 errors
 */
export class ForbiddenErrorResponseDto extends ErrorResponseDto {
  @ApiProperty({
    description: 'Error message for forbidden access',
    example: 'Forbidden - Access denied',
  })
  declare message: string;
}

/**
 * NotFoundErrorResponseDto - DTO cho 404 errors
 */
export class NotFoundErrorResponseDto extends ErrorResponseDto {
  @ApiProperty({
    description: 'Error message for resource not found',
    example: 'Resource not found',
  })
  declare message: string;
}
