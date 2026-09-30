import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsString, MaxLength, MinLength } from 'class-validator';

/**
 * ==============================================================================
 * RegisterDto (Data Transfer Object สำหรับสมัครสมาชิก)
 * ==============================================================================
 * กำหนดข้อมูลที่ผู้ใช้ต้องส่งเมื่อสมัครสมาชิกใหม่
 *
 * Backend Concept:
 * - รหัสผ่านต้องมีความยาวอย่างน้อย 6 ตัวอักษร และไม่เกิน 72 ตัวอักษร (ข้อจำกัด bcrypt)
 * - การลงทะเบียนสาธารณะจะได้รับสิทธิ์เป็น AUTHOR โดยอัตโนมัติเสมอ
 * ==============================================================================
 */
export class RegisterDto {
  @ApiProperty({ example: 'John Doe', description: 'User full name', maxLength: 100 })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name: string;

  @ApiProperty({ example: 'john@example.com', description: 'User valid email address', maxLength: 255 })
  @IsEmail()
  @IsNotEmpty()
  @MaxLength(255)
  email: string;

  @ApiProperty({ example: 'password123', description: 'Password (minimum 6 characters, max 72 characters)', minLength: 6, maxLength: 72 })
  @IsString()
  @IsNotEmpty()
  @MinLength(6)
  @MaxLength(72)
  password: string;
}
