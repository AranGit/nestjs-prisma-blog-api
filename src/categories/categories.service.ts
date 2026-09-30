import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { CreateCategoryDto } from './dto/create-category.dto.js';
import { UpdateCategoryDto } from './dto/update-category.dto.js';

/**
 * ==============================================================================
 * CategoriesService (Business Logic สำหรับหมวดหมู่บทความ)
 * ==============================================================================
 * จัดการสร้าง, ค้นหา, แก้ไข และลบหมวดหมู่บทความในบล็อก
 *
 * Backend Concept:
 * 1. Database Aggregation (`_count`):
 *    - เมื่อดึงหมวดหมู่ทั้งหมด แทนที่จะดึงโพสต์ทั้งหมดขึ้นมานับใน JavaScript (ซึ่งเปลือง RAM)
 *    - เราใช้ `_count: { select: { posts: true } }` เพื่อให้ SQL รันคำสั่ง `COUNT(*)` ฝั่ง Database
 * 2. Uniqueness Validation on Update:
 *    - ตอนอัปเดตชื่อหมวดหมู่ ต้องเช็คว่าชื่อใหม่ซ้ำกับหมวดหมู่อื่นหรือไม่ (`existing.id !== id`)
 * 3. Referential Integrity (Foreign Key Constraint):
 *    - ใน schema.prisma เราตั้งค่าไว้ว่า `onDelete: Restrict`
 *    - ดังนั้น หาก Category ยังมีบทความผูกอยู่ Database จะไม่อนุญาตให้ลบ เพื่อป้องกันข้อมูลกำพร้า
 * ==============================================================================
 */
@Injectable()
export class CategoriesService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * สร้างหมวดหมู่ใหม่
   */
  async create(createCategoryDto: CreateCategoryDto) {
    // ตรวจสอบว่าชื่อหมวดหมู่นี้ซ้ำกับที่มีอยู่แล้วหรือไม่
    const existing = await this.prisma.category.findUnique({
      where: { name: createCategoryDto.name },
    });

    if (existing) {
      throw new ConflictException(`Category '${createCategoryDto.name}' already exists`);
    }

    return this.prisma.category.create({
      data: createCategoryDto,
    });
  }

  /**
   * ดึงรายชื่อหมวดหมู่ทั้งหมด เรียงตามตัวอักษร พร้อมจำนวนบทความในแต่ละหมวดหมู่ (เฉพาะที่ยังไม่ถูกลบ)
   */
  async findAll() {
    return this.prisma.category.findMany({
      where: { deletedAt: null },
      include: {
        // นับจำนวนบทความที่ยังไม่ถูกลบในแต่ละหมวดหมู่ด้วย Database COUNT Query
        _count: {
          select: {
            posts: {
              where: { deletedAt: null },
            },
          },
        },
      },
      // เรียงลำดับชื่อจาก A-Z
      orderBy: { name: 'asc' },
    });
  }

  /**
   * ดึงข้อมูลหมวดหมู่รายอัน พร้อมรายการบทความที่สังกัดในหมวดหมู่นี้ (เฉพาะที่ยังไม่ถูกลบ)
   */
  async findOne(id: number) {
    const category = await this.prisma.category.findFirst({
      where: { id, deletedAt: null },
      include: {
        posts: {
          where: { deletedAt: null },
          select: {
            id: true,
            title: true,
            isPublished: true,
            createdAt: true,
          },
        },
      },
    });

    if (!category) {
      throw new NotFoundException(`Category with ID ${id} not found`);
    }

    return category;
  }

  /**
   * แก้ไขชื่อหมวดหมู่
   */
  async update(id: number, updateCategoryDto: UpdateCategoryDto) {
    // 1. ตรวจสอบว่าหมวดหมู่เดิมมีอยู่จริงไหม
    await this.findOne(id);

    // 2. ถ้ามีการส่งชื่อใหม่มา ให้เช็คว่าชื่อใหม่ไปซ้ำกับ ID อื่นหรือไม่
    if (updateCategoryDto.name) {
      const existing = await this.prisma.category.findUnique({
        where: { name: updateCategoryDto.name },
      });

      if (existing && existing.id !== id) {
        throw new ConflictException(`Category '${updateCategoryDto.name}' already exists`);
      }
    }

    return this.prisma.category.update({
      where: { id },
      data: updateCategoryDto,
    });
  }

  /**
   * ลบหมวดหมู่ (Soft Delete)
   * Soft Restrict: หากหมวดหมู่นี้ยังมีบทความที่ Active อยู่ จะไม่อนุญาตให้ลบ
   */
  async remove(id: number) {
    await this.findOne(id);

    const activePostsCount = await this.prisma.post.count({
      where: { categoryId: id, deletedAt: null },
    });

    if (activePostsCount > 0) {
      throw new ConflictException(
        `Cannot delete category because it still has ${activePostsCount} active post(s)`,
      );
    }

    return this.prisma.category.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }
}
