import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsOptional, IsString, MinLength } from 'class-validator';

/**
 * ==============================================================================
 * 📝 UpdateUserDto (Data Transfer Object สำหรับแก้ไขข้อมูลผู้ใช้)
 * ==============================================================================
 * ในการแก้ไขข้อมูล (PATCH / PUT) ผู้ใช้อาจต้องการแก้ไขเพียงบางฟิลด์เท่านั้น
 *
 * 💡 Backend Concept:
 * 1. Partial Update (PATCH): ทุกฟิลด์ควรเป็น Optional (?) เพื่อให้ Client ส่งเฉพาะฟิลด์ที่ต้องการเปลี่ยนได้
 * 2. `@IsOptional()`: หาก Client ไม่ได้ส่งฟิลด์นี้มา จะข้ามการตรวจสอบ Validation ของฟิลด์นั้นไป
 *    แต่ถ้าหากส่งมา จะต้องผ่านเงื่อนไข Validation ที่ระบุไว้ (เช่น ถ้าส่ง email มา ก็ต้องเป็น email ที่ถูกต้อง)
 * 3. `@ApiPropertyOptional()`: แสดงใน Swagger ว่าฟิลด์นี้ไม่จำเป็นต้องระบุ (Optional parameter)
 * ==============================================================================
 */
export class UpdateUserDto {
  @ApiPropertyOptional({ example: 'john@example.com', description: 'Updated email address' })
  @IsEmail()
  @IsOptional()
  email?: string;

  @ApiPropertyOptional({ example: 'newPassword123', description: 'Updated password (minimum 6 characters)', minLength: 6 })
  @IsString()
  @IsOptional()
  @MinLength(6)
  password?: string;

  @ApiPropertyOptional({ example: 'John Updated', description: 'Updated display name' })
  @IsString()
  @IsOptional()
  name?: string;
}
