import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsInt, IsOptional, IsString, MinLength } from 'class-validator';
import { Type } from 'class-transformer';

/**
 * ==============================================================================
 * UpdatePostDto (Data Transfer Object สำหรับแก้ไขบทความ)
 * ==============================================================================
 * รองรับการแก้ไขเนื้อหา, หัวข้อ, สถานะเผยแพร่ หรือย้ายหมวดหมู่
 *
 * Backend Security & Design Decision:
 * 1. ไม่อนุญาตให้แก้ไข `authorId` ใน DTO นี้!
 *    - ผู้เขียนเดิมไม่ควรถูกเปลี่ยนมั่วซั่วจากการเรียก API ทั่วไป
 *    - หากระบบต้องการโอนความเป็นเจ้าของบทความ (Transfer Ownership) ควรสร้่าง Endpoint แยกเฉพาะทางพร้อมสิทธิ์ Admin
 * 2. ทุกฟิลด์เป็น `@IsOptional()` ทำให้ Client ส่งมาเฉพาะฟิลด์ที่ต้องการเปลี่ยนได้
 * ==============================================================================
 */
export class UpdatePostDto {
  @ApiPropertyOptional({ example: 'Updated Post Title', description: 'Updated post title (minimum 3 characters)', minLength: 3 })
  @IsString()
  @IsOptional()
  @MinLength(3)
  title?: string;

  @ApiPropertyOptional({ example: 'Updated content...', description: 'Updated post content' })
  @IsString()
  @IsOptional()
  content?: string;

  @ApiPropertyOptional({ example: true, description: 'Publish status flag' })
  @IsBoolean()
  @IsOptional()
  isPublished?: boolean;

  @ApiPropertyOptional({ example: 2, description: 'Move to a different Category ID' })
  @IsInt()
  @IsOptional()
  @Type(() => Number)
  categoryId?: number;
}
