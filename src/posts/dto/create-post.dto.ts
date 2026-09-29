import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsInt, IsNotEmpty, IsOptional, IsString, MinLength } from 'class-validator';
import { Type } from 'class-transformer';

/**
 * ==============================================================================
 * 📥 CreatePostDto (Data Transfer Object สำหรับสร้างบทความใหม่)
 * ==============================================================================
 * กำหนดข้อมูลที่จำเป็นต้องส่งเข้ามาเพื่อสร้างบทความลงในบล็อก
 *
 * 💡 Backend Concept:
 * 1. Foreign Key Validation:
 *    - `authorId` และ `categoryId` ต้องเป็นจำนวนเต็ม (`@IsInt()`)
 *    - `@Type(() => Number)`: ใช้ `class-transformer` บังคับแปลงค่าที่ส่งเข้ามาให้เป็นชนิดตัวเลข
 * 2. Default Values:
 *    - `isPublished`: เป็น optional หากผู้ใช้ไม่ส่งมาจะ default เป็น false ใน Database
 * ==============================================================================
 */
export class CreatePostDto {
  @ApiProperty({ example: 'Getting Started with NestJS', description: 'Post title (minimum 3 characters)', minLength: 3 })
  @IsString()
  @IsNotEmpty()
  @MinLength(3)
  title: string;

  @ApiProperty({ example: 'This is the content of the post...', description: 'Full body content of the blog post' })
  @IsString()
  @IsNotEmpty()
  content: string;

  @ApiPropertyOptional({ example: false, description: 'Whether the post is published or draft', default: false })
  @IsBoolean()
  @IsOptional()
  isPublished?: boolean;

  @ApiProperty({ example: 1, description: 'Author User ID (Foreign Key to users table)' })
  @IsInt()
  @Type(() => Number)
  authorId: number;

  @ApiProperty({ example: 1, description: 'Category ID (Foreign Key to categories table)' })
  @IsInt()
  @Type(() => Number)
  categoryId: number;
}
