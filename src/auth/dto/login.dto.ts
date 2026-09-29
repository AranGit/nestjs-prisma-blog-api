import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsString } from 'class-validator';

/**
 * ==============================================================================
 * LoginDto (Data Transfer Object สำหรับเข้าสู่ระบบ)
 * ==============================================================================
 * กำหนดข้อมูล Email และ Password ที่จำเป็นสำหรับการเข้าสู่ระบบ
 * ==============================================================================
 */
export class LoginDto {
  @ApiProperty({ example: 'john@example.com', description: 'Registered user email' })
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @ApiProperty({ example: 'password123', description: 'User password' })
  @IsString()
  @IsNotEmpty()
  password: string;
}
