import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { Prisma, Role } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service.js';
import { RedisService } from '../redis/redis.service.js';
import { CreatePostDto } from './dto/create-post.dto.js';
import { UpdatePostDto } from './dto/update-post.dto.js';
import { QueryPostV2Dto } from './dto/query-post-v2.dto.js';

/**
 * ==============================================================================
 * PostsService (Business Logic สำหรับบทความบล็อก)
 * ==============================================================================
 * รองรับการทำงานทั้ง API Version 1 (CRUD พื้นฐาน) และ Version 2 (Pagination, Metrics)
 * พร้อมระบบ Ownership Authorization (ผู้ใช้แก้ได้เฉพาะโพสต์ของตนเอง)
 * และระบบ Redis Caching (Cache-Aside + Invalidation)
 * ==============================================================================
 */
@Injectable()
export class PostsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly redisService: RedisService,
  ) {}

  // ═══════════════════════════════════════════════════════════
  // V1 Methods (Standard CRUD)
  // ═══════════════════════════════════════════════════════════

  /**
   * สร้างบทความใหม่
   * @param createPostDto ข้อมูลบทความ (title, content, categoryId)
   * @param authorId ID ผู้เขียนที่สกัดได้จาก JWT Token
   */
  async create(createPostDto: CreatePostDto, authorId: number) {
    // 1. ตรวจสอบว่า Author ID มีตัวตนและยังไม่ถูกลบ
    const author = await this.prisma.user.findFirst({
      where: { id: authorId, deletedAt: null },
    });
    if (!author) {
      throw new NotFoundException(`User with ID ${authorId} not found`);
    }

    // 2. ตรวจสอบว่า Category ID มีตัวตนและยังไม่ถูกลบ
    const category = await this.prisma.category.findFirst({
      where: { id: createPostDto.categoryId, deletedAt: null },
    });
    if (!category) {
      throw new NotFoundException(`Category with ID ${createPostDto.categoryId} not found`);
    }

    // 3. บันทึกลงฐานข้อมูลและดึงข้อมูลสัมพันธ์ (Relations) กลับมา
    const newPost = await this.prisma.post.create({
      data: {
        ...createPostDto,
        authorId,
      },
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

    // Cache Invalidation: ล้างแคชรายการบทความ v2 ทั้งหมดเพื่อให้ผู้ใช้เห็นโพสต์ใหม่ทันที
    await this.redisService.delByPattern('posts:v2:*');

    return newPost;
  }

  /**
   * ดึงบทความทั้งหมด (V1: คืนค่าเป็น Raw Array เรียงจากใหม่ไปเก่า เฉพาะที่ยังไม่ถูก Soft Delete)
   */
  async findAll() {
    return this.prisma.post.findMany({
      where: { deletedAt: null },
      take: 100, // Safety limit: ป้องกัน memory exhaustion จากข้อมูลขนาดใหญ่
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
   * ค้นหาบทความตาม ID (เฉพาะที่ยังไม่ถูก Soft Delete)
   */
  async findOne(id: number) {
    const post = await this.prisma.post.findFirst({
      where: { id, deletedAt: null },
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
   * ดึงเฉพาะบทความที่เผยแพร่แล้ว (isPublished = true และ deletedAt = null)
   */
  async findPublished() {
    return this.prisma.post.findMany({
      where: { isPublished: true, deletedAt: null },
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
   * แก้ไขบทความ
   * Ownership Authorization:
   * - ผู้ใช้ที่เป็น ADMIN สามารถแก้ไขบทความของใครก็ได้
   * - ผู้ใช้ที่เป็น AUTHOR สามารถแก้ไขได้เฉพาะบทความที่ตนเองเป็นผู้เขียนเท่านั้น
   */
  async update(
    id: number,
    updatePostDto: UpdatePostDto,
    currentUser: { id: number; role: Role },
  ) {
    const post = await this.findOne(id);

    // ตรวจสอบสิทธิ์ความเป็นเจ้าของบทความ (Ownership check)
    if (currentUser.role !== Role.ADMIN && post.authorId !== currentUser.id) {
      throw new ForbiddenException('You can only update your own posts');
    }

    if (updatePostDto.categoryId) {
      const category = await this.prisma.category.findFirst({
        where: { id: updatePostDto.categoryId, deletedAt: null },
      });
      if (!category) {
        throw new NotFoundException(`Category with ID ${updatePostDto.categoryId} not found`);
      }
    }

    const updatedPost = await this.prisma.post.update({
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

    // Cache Invalidation: ล้างแคชรายการบทความ v2 เมื่อข้อมูลถูกแก้ไข
    await this.redisService.delByPattern('posts:v2:*');

    return updatedPost;
  }

  /**
   * ลบบทความตาม ID (Soft Delete: บันทึก deletedAt เป็นเวลาปัจจุบัน)
   * Ownership Authorization:
   * - ADMIN ลบบทความใดก็ได้
   * - AUTHOR ลบได้เฉพาะบทความของตนเอง
   */
  async remove(id: number, currentUser: { id: number; role: Role }) {
    const post = await this.findOne(id);

    // ตรวจสอบสิทธิ์ความเป็นเจ้าของบทความ
    if (currentUser.role !== Role.ADMIN && post.authorId !== currentUser.id) {
      throw new ForbiddenException('You can only delete your own posts');
    }

    const deletedPost = await this.prisma.post.update({
      where: { id },
      data: { deletedAt: new Date() },
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

    // Cache Invalidation: ล้างแคชรายการบทความ v2 เมื่อบทความถูกลบ
    await this.redisService.delByPattern('posts:v2:*');

    return deletedPost;
  }

  // ═══════════════════════════════════════════════════════════
  // V2 Methods (Pagination, Search, Analytics & Metrics)
  // ═══════════════════════════════════════════════════════════

  /**
   * V2: ดึงบทความแบบแบ่งหน้า (Pagination) พร้อมค้นหา (Search & Filter) + Redis Caching (เฉพาะที่ยังไม่ถูก Soft Delete)
   *
   * Cache-Aside Pattern (Lazy Loading):
   * 1. สร้าง Unique Cache Key ตาม parameter ทั้งหมด (page, limit, search, categoryId)
   * 2. ตรวจสอบใน Redis Cache ก่อน (Cache Hit?):
   *    - ถ้ามีข้อมูล -> คืนค่ากลับทันที (Response Time ระดับ < 5ms) โดยไม่ต้องต่อ Database
   * 3. ถ้าไม่มีข้อมูลในแคช (Cache Miss):
   *    - ทำการคิวรีฐานข้อมูล PostgreSQL ผ่าน Prisma
   *    - บันทึกผลลัพธ์ลง Redis Cache พร้อมกำหนด TTL (Time-To-Live = 60 วินาที)
   *    - คืนค่าผลลัพธ์ให้ไคลเอนต์
   */
  async findAllV2(query: QueryPostV2Dto) {
    const page = query.page && query.page > 0 ? query.page : 1;
    const limit = query.limit && query.limit > 0 ? query.limit : 10;
    const skip = (page - 1) * limit;

    // 1. สร้าง Cache Key ตาม query parameters ที่ส่งเข้ามา
    const cacheKey = `posts:v2:p${page}:l${limit}:s${query.search || ''}:c${query.categoryId || ''}`;

    // 2. ตรวจสอบ Cache Hit
    const cachedData = await this.redisService.get<{
      data: Record<string, unknown>[];
      meta: {
        total: number;
        page: number;
        limit: number;
        totalPages: number;
        hasNextPage: boolean;
        hasPreviousPage: boolean;
      };
    }>(cacheKey);

    if (cachedData) {
      return cachedData;
    }

    // 3. Cache Miss: สร้าง Where Clause แบบ Dynamic กรองเฉพาะโพสต์ที่ยังไม่ถูกลบ (deletedAt: null)
    const where: Prisma.PostWhereInput = { deletedAt: null };

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

    // Performance Optimization: ใช้ Promise.all รัน Query 2 ตัวพร้อมกันในระดับ Database
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

    const result = {
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

    // 4. บันทึกผลลัพธ์ลง Redis ด้วย TTL 60 วินาที
    await this.redisService.set(cacheKey, result, 60);

    return result;
  }

  /**
   * V2: ดึงบทความเดี่ยวพร้อมคำนวณเวลาอ่าน (Reading Time) และบทความที่เกี่ยวข้อง (Related Posts)
   */
  async findOneV2(id: number) {
    const post = await this.findOne(id);

    // คำนวณเวลาอ่านโดยเฉลี่ยของมนุษย์ (~200 คำต่อนาที)
    const wordCount = post.content.trim().split(/\s+/).length;
    const readingTimeMinutes = Math.max(1, Math.ceil(wordCount / 200));

    // ค้นหาบทความแนะนำในหมวดหมู่เดียวกัน (ดึง 3 บทความล่าสุด ยกเว้นบทความปัจจุบัน และต้องยังไม่ถูกลบ)
    const relatedPosts = await this.prisma.post.findMany({
      where: {
        categoryId: post.categoryId,
        id: { not: post.id },
        deletedAt: null,
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
   * V2: ดึงสถิติภาพรวมของบล็อก (Analytics Summary - นับเฉพาะ Resource ที่ยัง Active)
   * ใช้สำหรับการแสดงผลบน Dashboard ของผู้ดูแลระบบ
   */
  async getStatsV2() {
    const [totalPosts, publishedPosts, totalCategories, totalUsers] = await Promise.all([
      this.prisma.post.count({ where: { deletedAt: null } }),
      this.prisma.post.count({ where: { isPublished: true, deletedAt: null } }),
      this.prisma.category.count({ where: { deletedAt: null } }),
      this.prisma.user.count({ where: { deletedAt: null } }),
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
