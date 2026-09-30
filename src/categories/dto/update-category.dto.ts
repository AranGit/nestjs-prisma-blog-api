import { PartialType } from '@nestjs/swagger';
import { CreateCategoryDto } from './create-category.dto.js';

/**
 * ==============================================================================
 * UpdateCategoryDto (Data Transfer Object สำหรับแก้ไขชื่อหมวดหมู่)
 * ==============================================================================
 * สืบทอดฟิลด์และการ validate ทั้งหมดจาก CreateCategoryDto โดยเปลี่ยนทุกฟิลด์เป็น Optional
 * ==============================================================================
 */
export class UpdateCategoryDto extends PartialType(CreateCategoryDto) {}
