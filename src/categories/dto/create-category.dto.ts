import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MaxLength, MinLength } from 'class-validator';

/**
 * ==============================================================================
 * CreateCategoryDto (Data Transfer Object สำหรับสร้างหมวดหมู่)
 * ==============================================================================
 * กำหนดกฎเกณฑ์ความถูกต้องของข้อมูลหมวดหมู่ก่อนบันทึก
 *
 * Backend Concept:
 * - `@MinLength(2)`: ป้องกันการตั้งชื่อหมวดหมู่ที่สั้นเกินไปหรือไม่สื่อความหมาย
 * - `@MaxLength(100)`: ป้องกันการตั้งชื่อยาวเกินไปจนเกิดปัญหาในฐานข้อมูล
 * - `@IsNotEmpty()`: ตรวจสอบไม่ให้ส่ง string ว่างมา
 * ==============================================================================
 */
export class CreateCategoryDto {
  @ApiProperty({ example: 'Technology', description: 'Category name (2-100 characters)', minLength: 2, maxLength: 100 })
  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  @MaxLength(100)
  name: string;
}
