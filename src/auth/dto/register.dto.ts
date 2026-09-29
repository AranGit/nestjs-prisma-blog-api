import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsEnum, IsNotEmpty, IsOptional, IsString, MinLength } from 'class-validator';
import { Role } from '@prisma/client';

/**
 * ==============================================================================
 * 📥 RegisterDto (Data Transfer Object สำหรับสมัครสมาชิก)
 * ==============================================================================
 * กำหนดข้อมูลที่ผู้ใช้ต้องส่งเมื่อสมัครสมาชิกใหม่
 *
 * 💡 Backend Concept:
 * - รหัสผ่านต้องมีความยาวอย่างน้อย 6 ตัวอักษร
 * - รองรับการเลือก Role ได้ (เช่น สำหรับ Admin สร้าง User หรือทดสอบ)
 *   โดยค่าเริ่มต้นถ้าไม่ส่งมาจะถูกกำหนดเป็น AUTHOR
 * ==============================================================================
 */
export class RegisterDto {
  @ApiProperty({ example: 'John Doe', description: 'User full name' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ example: 'john@example.com', description: 'User valid email address' })
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @ApiProperty({ example: 'password123', description: 'Password (minimum 6 characters)', minLength: 6 })
  @IsString()
  @IsNotEmpty()
  @MinLength(6)
  password: string;

  @ApiPropertyOptional({ enum: Role, default: Role.AUTHOR, description: 'User role (ADMIN or AUTHOR)' })
  @IsOptional()
  @IsEnum(Role)
  role?: Role;
}
