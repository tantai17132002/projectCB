import { ApiProperty } from '@nestjs/swagger';

/**
 * UserResponseDto - DTO cho response của user
 */
export class UserResponseDto {
  @ApiProperty({
    description: 'User ID',
    example: 1
  })
  id: number;

  @ApiProperty({
    description: 'Username',
    example: 'john_doe'
  })
  username: string;

  @ApiProperty({
    description: 'User email',
    example: 'john@example.com'
  })
  email: string;

  @ApiProperty({
    description: 'User role',
    example: 'user',
    enum: ['user', 'admin']
  })
  role: string;

  @ApiProperty({
    description: 'User creation date',
    example: '2024-01-15T10:30:00.000Z'
  })
  createdAt: Date;

  @ApiProperty({
    description: 'User last update date',
    example: '2024-01-15T10:30:00.000Z'
  })
  updatedAt: Date;
}

/**
 * UserListResponseDto - DTO cho response danh sách users
 */
export class UserListResponseDto {
  @ApiProperty({
    description: 'List of users',
    type: [UserResponseDto]
  })
  users: UserResponseDto[];

  @ApiProperty({
    description: 'Total number of users',
    example: 15
  })
  total: number;
}
