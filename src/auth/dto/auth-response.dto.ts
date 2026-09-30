import { ApiProperty } from '@nestjs/swagger';
import { Role } from '@prisma/client';

export class UserProfileDto {
  @ApiProperty({ example: '019245bb-8e34-7389-9a74-9f8263590001' })
  id: string;

  @ApiProperty({ example: 'john@example.com' })
  email: string;

  @ApiProperty({ example: 'John Doe' })
  name: string;

  @ApiProperty({ enum: Role, example: Role.AUTHOR })
  role: Role;
}

export class AuthResponseDto {
  @ApiProperty({
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
    description: 'JWT Access Token for Bearer authentication',
  })
  accessToken: string;

  @ApiProperty({ type: UserProfileDto })
  user: UserProfileDto;
}
