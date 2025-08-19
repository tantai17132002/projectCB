import { ApiProperty } from '@nestjs/swagger';
import { UserResponseDto } from './user-response.dto';
import { PaginationMetaDto } from '@/common/dto/pagination.dto';

/**
 * UserPaginationResponseDto - DTO cho response pagination của users
 */
export class UserPaginationResponseDto {
  @ApiProperty({
    description: 'List of users',
    type: [UserResponseDto]
  })
  users: UserResponseDto[];

  @ApiProperty({
    description: 'Pagination metadata',
    type: PaginationMetaDto
  })
  pagination: PaginationMetaDto;
}
