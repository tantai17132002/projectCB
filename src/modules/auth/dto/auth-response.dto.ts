import { ApiProperty } from '@nestjs/swagger';

/**
 * UserResponseDto - DTO cho thông tin user trong response
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
    example: 'user'
  })
  role: string;
}

/**
 * RegisterResponseDto - DTO cho response khi đăng ký thành công
 */
export class RegisterResponseDto {
  @ApiProperty({
    description: 'Success message',
    example: 'User registered successfully'
  })
  message: string;

  @ApiProperty({
    description: 'Created user information',
    type: UserResponseDto
  })
  user: UserResponseDto;
}

/**
 * LoginResponseDto - DTO cho response khi đăng nhập thành công
 */
export class LoginResponseDto {
  @ApiProperty({
    description: 'JWT access token',
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOjEsInVzZXJuYW1lIjoiam9obl9kb2UiLCJyb2xlIjoidXNlciIsImlhdCI6MTYzNjQ5NjAwMCwiZXhwIjoxNjM2NTgyNDAwfQ.example'
  })
  access_token: string;
}
