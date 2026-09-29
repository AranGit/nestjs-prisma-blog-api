import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

/**
 * ==============================================================================
 * 🔎 QueryPostV2Dto (DTO สำหรับ Query Parameters ใน API v2)
 * ==============================================================================
 * ใช้สำหรับรับพารามิเตอร์การค้นหาและแบ่งหน้า (Pagination, Search & Filtering)
 * ตัวอย่าง URL: `/api/v2/posts?page=2&limit=10&search=NestJS&categoryId=1`
 *
 * 💡 Backend Concept:
 * 1. Pagination Protection:
 *    - `@Min(1)`: หมายเลขหน้าต้องเริ่มจาก 1 ขึ้นไป
 *    - `@Max(50)`: จำกัดจำนวนข้อมูลสูงสุดต่อหน้าไม่เกิน 50 รายการ
 *      (สำคัญมาก! ป้องกันผู้ใช้ยิง query ขอข้อมูลทีละ 100,000 รายการจน Server Memory เต็ม หรือ DoS)
 * 2. Type Transformation:
 *    - Query parameter ใน URL string จะส่งมาเป็นข้อความ เช่น "?page=2"
 *    - `@Type(() => Number)` จะแปลง string "2" ให้เป็น number 2 อัตโนมัติ
 * ==============================================================================
 */
export class QueryPostV2Dto {
  @ApiPropertyOptional({ example: 1, description: 'Page number (minimum: 1, default: 1)', default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ example: 10, description: 'Items per page (1-50, default: 10)', default: 10 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  limit?: number = 10;

  @ApiPropertyOptional({ example: 'NestJS', description: 'Search keyword matching title or content' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ example: 1, description: 'Filter posts by specific Category ID' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  categoryId?: number;
}
