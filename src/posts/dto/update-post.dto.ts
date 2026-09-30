import { PartialType } from '@nestjs/swagger';
import { CreatePostDto } from './create-post.dto.js';

/**
 * ==============================================================================
 * UpdatePostDto (Data Transfer Object สำหรับแก้ไขบทความ)
 * ==============================================================================
 * รองรับการแก้ไขเนื้อหา, หัวข้อ, สถานะเผยแพร่ หรือย้ายหมวดหมู่
 * สืบทอดฟิลด์และการ validate ทั้งหมดจาก CreatePostDto โดยเปลี่ยนทุกฟิลด์เป็น Optional
 *
 * Backend Security & Design Decision:
 * 1. ไม่อนุญาตให้แก้ไข `authorId` ใน DTO นี้!
 *    - ผู้เขียนเดิมไม่ควรถูกเปลี่ยนจากการเรียก API ทั่วไป
 * 2. PartialType จะแปลงทุก validation rules และ swagger docs ให้เป็น optional อัตโนมัติ
 * ==============================================================================
 */
export class UpdatePostDto extends PartialType(CreatePostDto) {}
