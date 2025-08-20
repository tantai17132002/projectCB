import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty } from 'class-validator';

/**
 * MessageResponseDto - DTO chung cho response chỉ có message
 */
export class MessageResponseDto {
  @ApiProperty({
    description: 'Response message',
    example: 'Operation completed successfully',
  })
  @IsString()
  @IsNotEmpty()
  message: string;
}

/**
 * DataResponseDto - DTO chung cho response có data
 */
export class DataResponseDto<T = any> {
  @ApiProperty({
    description: 'Response data',
  })
  data: T;
}

/**
 * MessageDataResponseDto - DTO chung cho response có message và data
 */
export class MessageDataResponseDto<T = any> {
  @ApiProperty({
    description: 'Response message',
    example: 'Operation completed successfully',
  })
  @IsString()
  @IsNotEmpty()
  message: string;

  @ApiProperty({
    description: 'Response data',
  })
  data: T;
}
