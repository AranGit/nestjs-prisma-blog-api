import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsInt, IsNotEmpty, IsOptional, IsString, MinLength } from 'class-validator';
import { Type } from 'class-transformer';

/**
 * ==============================================================================
 * 📥 CreatePostDto (Data Transfer Object สำหรับสร้างบทความใหม่)
 * ==============================================================================
 * กำหนดข้อมูลที่ Client ต้องส่งเข้ามาเพื่อสร้างบทความ
 *
 * 💡 Backend Security Decision:
 * - ⚠️ ไม่มีฟิลด์ `authorId` ใน Body อีกต่อไป!
 * - `authorId` จะถูกดึงจาก JWT Token ของผู้ใช้ที่ล็อกอินอยู่โดยตรง (`req.user.id`)
 * - ป้องกันช่องโหว่ที่ผู้ใช้พยายามส่ง authorId ของคนอื่นเพื่อแอบอ้างสร้างบทความในชื่อคนอื่น (Impersonation)
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

  @ApiProperty({ example: 1, description: 'Category ID (Foreign Key to categories table)' })
  @IsInt()
  @Type(() => Number)
  categoryId: number;
}
