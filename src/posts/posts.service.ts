import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { CreatePostDto } from './dto/create-post.dto.js';
import { UpdatePostDto } from './dto/update-post.dto.js';
import { QueryPostV2Dto } from './dto/query-post-v2.dto.js';

/**
 * ==============================================================================
 * 📝 PostsService (Business Logic สำหรับบทความบล็อก)
 * ==============================================================================
 * รองรับการทำงานทั้ง API Version 1 (CRUD พื้นฐาน) และ Version 2 (Pagination, Metrics)
 *
 * 💡 Key Backend Concepts Demonstrated:
 * 1. Foreign Key Verification: ตรวจสอบความมีอยู่จริงของ Author และ Category ก่อนบันทึก
 * 2. Eager Loading / SQL Joins (`include`): ดึงข้อมูลข้ามตาราง (User, Category) ใน Query เดียว
 * 3. Parallel Database Queries (`Promise.all`): ยิง Query นับจำนวน (Count) และดึงข้อมูล (FindMany)
 *    พร้อมกัน เพื่อลดเวลา Response Time ของ API
 * 4. Pagination Formula:
 *    - `skip = (page - 1) * limit`
 *    - `take = limit`
 * ==============================================================================
 */
@Injectable()
export class PostsService {
  constructor(private readonly prisma: PrismaService) {}

  // ═══════════════════════════════════════════════════════════
  // 🟢 V1 Methods (Standard CRUD)
  // ═══════════════════════════════════════════════════════════

  /**
   * ➕ สร้างบทความใหม่
   * 1. ตรวจสอบว่ามีผู้ใช้นี้ (Author) อยู่จริงหรือไม่
   * 2. ตรวจสอบว่ามีหมวดหมู่นี้ (Category) อยู่จริงหรือไม่
   * 3. บันทึกบทความพร้อม join ข้อมูลชื่อผู้เขียนและชื่อหมวดหมู่ส่งกลับไป
   */
  async create(createPostDto: CreatePostDto) {
    // 1. ตรวจสอบว่า Author ID มีตัวตนอยู่ในตาราง users
    const author = await this.prisma.user.findUnique({
      where: { id: createPostDto.authorId },
    });
    if (!author) {
      throw new NotFoundException(`User with ID ${createPostDto.authorId} not found`);
    }

    // 2. ตรวจสอบว่า Category ID มีตัวตนอยู่ในตาราง categories
    const category = await this.prisma.category.findUnique({
      where: { id: createPostDto.categoryId },
    });
    if (!category) {
      throw new NotFoundException(`Category with ID ${createPostDto.categoryId} not found`);
    }

    // 3. บันทึกลงฐานข้อมูลและดึงข้อมูลสัมพันธ์ (Relations) กลับมา
    return this.prisma.post.create({
      data: createPostDto,
      include: {
        author: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        category: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });
  }

  /**
   * 📋 ดึงบทความทั้งหมด (V1: คืนค่าเป็น Raw Array เรียงจากใหม่ไปเก่า)
   */
  async findAll() {
    return this.prisma.post.findMany({
      include: {
        author: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        category: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * 🔍 ค้นหาบทความตาม ID
   */
  async findOne(id: number) {
    const post = await this.prisma.post.findUnique({
      where: { id },
      include: {
        author: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        category: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    if (!post) {
      throw new NotFoundException(`Post with ID ${id} not found`);
    }

    return post;
  }

  /**
   * 🌐 ดึงเฉพาะบทความที่เผยแพร่แล้ว (isPublished = true)
   */
  async findPublished() {
    return this.prisma.post.findMany({
      where: { isPublished: true },
      include: {
        author: {
          select: {
            id: true,
            name: true,
          },
        },
        category: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * ✏️ แก้ไขบทความ
   * หากมีการเปลี่ยน categoryId ต้องตรวจสอบว่าหมวดหมู่ใหม่มีอยู่จริง
   */
  async update(id: number, updatePostDto: UpdatePostDto) {
    await this.findOne(id);

    if (updatePostDto.categoryId) {
      const category = await this.prisma.category.findUnique({
        where: { id: updatePostDto.categoryId },
      });
      if (!category) {
        throw new NotFoundException(`Category with ID ${updatePostDto.categoryId} not found`);
      }
    }

    return this.prisma.post.update({
      where: { id },
      data: updatePostDto,
      include: {
        author: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        category: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });
  }

  /**
   * 🗑️ ลบบทความตาม ID
   */
  async remove(id: number) {
    await this.findOne(id);

    return this.prisma.post.delete({
      where: { id },
      include: {
        author: {
          select: {
            id: true,
            name: true,
          },
        },
        category: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });
  }

  // ═══════════════════════════════════════════════════════════
  // 🚀 V2 Methods (Pagination, Search, Analytics & Metrics)
  // ═══════════════════════════════════════════════════════════

  /**
   * 📄 V2: ดึงบทความแบบแบ่งหน้า (Pagination) พร้อมค้นหา (Search & Filter)
   *
   * 💡 ทำไม V2 ถึงดีกว่า V1?
   * - ในระบบขนาดใหญ่ บทความอาจมีเป็นแสนบทความ การ return ทีเดียวทั้งหมดใน v1 จะทำให้ Server ล่ม
   * - v2 ใช้ `skip` และ `take` เพื่อดึงเฉพาะชิ้นที่ต้องการตามหน้า (Page)
   * - ส่ง `meta` กลับไปบอก Frontend ว่ามีทั้งหมดกี่หน้า และมีหน้าถัดไปหรือไม่
   */
  async findAllV2(query: QueryPostV2Dto) {
    const page = query.page && query.page > 0 ? query.page : 1;
    const limit = query.limit && query.limit > 0 ? query.limit : 10;
    const skip = (page - 1) * limit;

    // สร้าง Where Clause แบบ Dynamic ตามเงื่อนไขที่ส่งเข้ามา
    const where: any = {};

    // ค้นหาข้อความใน Title หรือ Content (Case-Insensitive)
    if (query.search) {
      where.OR = [
        { title: { contains: query.search, mode: 'insensitive' } },
        { content: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    // กรองตาม Category ID ถ้ามีการระบุ
    if (query.categoryId) {
      where.categoryId = query.categoryId;
    }

    // ⚡ Performance Optimization: ใช้ Promise.all รัน Query 2 ตัวพร้อมกันในระดับ Database
    const [total, posts] = await Promise.all([
      this.prisma.post.count({ where }),
      this.prisma.post.findMany({
        where,
        skip,
        take: limit,
        include: {
          author: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          category: {
            select: {
              id: true,
              name: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    const totalPages = Math.ceil(total / limit);

    return {
      data: posts,
      meta: {
        total,
        page,
        limit,
        totalPages,
        hasNextPage: page < totalPages,
        hasPreviousPage: page > 1,
      },
    };
  }

  /**
   * ⏱️ V2: ดึงบทความเดี่ยวพร้อมคำนวณเวลาอ่าน (Reading Time) และบทความที่เกี่ยวข้อง (Related Posts)
   */
  async findOneV2(id: number) {
    const post = await this.findOne(id);

    // คำนวณเวลาอ่านโดยเฉลี่ยของมนุษย์ (~200 คำต่อนาที)
    const wordCount = post.content.trim().split(/\s+/).length;
    const readingTimeMinutes = Math.max(1, Math.ceil(wordCount / 200));

    // ค้นหาบทความแนะนำในหมวดหมู่เดียวกัน (ดึง 3 บทความล่าสุด ยกเว้นบทความปัจจุบัน)
    const relatedPosts = await this.prisma.post.findMany({
      where: {
        categoryId: post.categoryId,
        id: { not: post.id },
      },
      take: 3,
      select: {
        id: true,
        title: true,
        isPublished: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    return {
      ...post,
      readingTimeMinutes,
      relatedPosts,
    };
  }

  /**
   * 📊 V2: ดึงสถิติภาพรวมของบล็อก (Analytics Summary)
   * ใช้สำหรับการแสดงผลบน Dashboard ของผู้ดูแลระบบ
   */
  async getStatsV2() {
    const [totalPosts, publishedPosts, totalCategories, totalUsers] = await Promise.all([
      this.prisma.post.count(),
      this.prisma.post.count({ where: { isPublished: true } }),
      this.prisma.category.count(),
      this.prisma.user.count(),
    ]);

    return {
      totalPosts,
      publishedPosts,
      draftPosts: totalPosts - publishedPosts,
      totalCategories,
      totalUsers,
    };
  }
}
