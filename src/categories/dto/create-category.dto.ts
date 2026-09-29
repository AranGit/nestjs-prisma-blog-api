import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MinLength } from 'class-validator';

/**
 * ==============================================================================
 * CreateCategoryDto (Data Transfer Object สำหรับสร้างหมวดหมู่)
 * ==============================================================================
 * กำหนดกฎเกณฑ์ความถูกต้องของข้อมูลหมวดหมู่ก่อนบันทึก
 *
 * Backend Concept:
 * - `@MinLength(2)`: ป้องกันการตั้งชื่อหมวดหมู่ที่สั้นเกินไปหรือไม่สื่อความหมาย (เช่น ตั้งชื่อแค่ตัวอักษรเดียว "a")
 * - `@IsNotEmpty()`: ตรวจสอบไม่ให้ส่ง string ว่างมา
 * ==============================================================================
 */
export class CreateCategoryDto {
  @ApiProperty({ example: 'Technology', description: 'Category name (minimum 2 characters)', minLength: 2 })
  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  name: string;
}
