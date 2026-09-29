import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MinLength } from 'class-validator';

/**
 * ==============================================================================
 * 📝 UpdateCategoryDto (Data Transfer Object สำหรับแก้ไขชื่อหมวดหมู่)
 * ==============================================================================
 * ทุกฟิลด์เป็น Optional สำหรับการอัปเดตข้อมูลแบบเฉพาะเจาะจง (PATCH)
 *
 * 💡 Backend Concept:
 * - หากระบุ name เข้ามา จะต้องมีความยาวไม่น้อยกว่า 2 ตัวอักษร
 * - หากไม่ระบุ name เข้ามา จะถือว่าไม่ต้องการแก้ไขฟิลด์นี้
 * ==============================================================================
 */
export class UpdateCategoryDto {
  @ApiPropertyOptional({ example: 'Science', description: 'Updated category name (minimum 2 characters)', minLength: 2 })
  @IsString()
  @IsOptional()
  @MinLength(2)
  name?: string;
}
