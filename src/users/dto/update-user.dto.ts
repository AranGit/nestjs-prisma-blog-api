import { OmitType, PartialType } from '@nestjs/swagger';
import { CreateUserDto } from './create-user.dto.js';

/**
 * ==============================================================================
 * UpdateUserDto (Data Transfer Object สำหรับแก้ไขข้อมูลผู้ใช้)
 * ==============================================================================
 * ในการแก้ไขข้อมูล (PATCH / PUT) ผู้ใช้อาจต้องการแก้ไขเพียงบางฟิลด์เท่านั้น
 * สืบทอดฟิลด์และการ validate ทั้งหมดจาก CreateUserDto (ยกเว้น role) และเปลี่ยนเป็น Optional
 * ==============================================================================
 */
export class UpdateUserDto extends PartialType(OmitType(CreateUserDto, ['role'] as const)) {}
