import { Test, TestingModule } from '@nestjs/testing';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { mockDeep, DeepMockProxy } from 'vitest-mock-extended';
import { PrismaClient } from '@prisma/client';
import { NotFoundException } from '@nestjs/common';
import { PostsService } from './posts.service.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { RedisService } from '../redis/redis.service.js';

/**
 * ==============================================================================
 * Unit Tests: PostsService (V1 & V2)
 * ==============================================================================
 * ทดสอบทั้ง V1 CRUD และ V2 Advanced Logic (Pagination, Reading Time, Stats)
 * พร้อมทดสอบระบบ Redis Caching (Cache-Aside & Cache Invalidation)
 *
 * Focus Areas:
 * 1. Foreign Key Verification: ตรวจสอบ Author และ Category ก่อน Create
 * 2. V2 Pagination Metadata: ทดสอบการคำนวณ totalPages, hasNextPage, hasPreviousPage
 * 3. V2 Calculated Attributes: ทดสอบการคำนวณ readingTimeMinutes จากจำนวนคำ
 * 4. Redis Cache Hit & Miss: ทดสอบการดึงจากแคช หรือการคิวรี DB เมื่อแคชว่าง
 * 5. Cache Invalidation: ทดสอบการล้างแคชเมื่อมีการ CUD (Create, Update, Delete)
 * ==============================================================================
 */
describe('PostsService', () => {
  let service: PostsService;
  let prismaMock: DeepMockProxy<PrismaClient>;
  let redisServiceMock: {
    get: ReturnType<typeof vi.fn>;
    set: ReturnType<typeof vi.fn>;
    del: ReturnType<typeof vi.fn>;
    delByPattern: ReturnType<typeof vi.fn>;
  };

  beforeEach(async () => {
    prismaMock = mockDeep<PrismaClient>();
    redisServiceMock = {
      get: vi.fn(),
      set: vi.fn(),
      del: vi.fn(),
      delByPattern: vi.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PostsService,
        {
          provide: PrismaService,
          useValue: prismaMock,
        },
        {
          provide: RedisService,
          useValue: redisServiceMock,
        },
      ],
    }).compile();

    service = module.get<PostsService>(PostsService);
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // 1. V1 Test Suite: create()
  // ─────────────────────────────────────────────────────────────────────────────
  // ─────────────────────────────────────────────────────────────────────────────
  // 1. V1 Test Suite: create()
  // ─────────────────────────────────────────────────────────────────────────────
  describe('create (v1)', () => {
    it('ควรสร้างบทความสำเร็จเมื่อ Author และ Category มีอยู่จริง', async () => {
      // 1. Author มีอยู่จริงและยังไม่ถูกลบ
      prismaMock.user.findFirst.mockResolvedValue({ id: 1 } as any);
      // 2. Category มีอยู่จริงและยังไม่ถูกลบ
      prismaMock.category.findFirst.mockResolvedValue({ id: 2 } as any);

      const mockCreatedPost = {
        id: 10,
        title: 'Mastering NestJS',
        content: 'Content here...',
        isPublished: true,
        authorId: 1,
        categoryId: 2,
        createdAt: new Date(),
        updatedAt: new Date(),
        author: { id: 1, name: 'John Doe', email: 'john@example.com' },
        category: { id: 2, name: 'Tech' },
      };
      prismaMock.post.create.mockResolvedValue(mockCreatedPost as any);

      const result = await service.create(
        {
          title: 'Mastering NestJS',
          content: 'Content here...',
          isPublished: true,
          categoryId: 2,
        },
        1, // authorId
      );

      expect(result.id).toBe(10);
      expect(result.author.name).toBe('John Doe');
      expect(prismaMock.post.create).toHaveBeenCalledOnce();
      expect(redisServiceMock.delByPattern).toHaveBeenCalledWith('posts:v2:*');
    });

    it('ควรโยน NotFoundException หากไม่พบ Author ID หรือถูกลบไปแล้ว', async () => {
      prismaMock.user.findFirst.mockResolvedValue(null);

      await expect(
        service.create(
          {
            title: 'Post',
            content: 'Content',
            categoryId: 1,
          },
          999, // invalid authorId
        ),
      ).rejects.toThrow(NotFoundException);
      expect(redisServiceMock.delByPattern).not.toHaveBeenCalled();
    });

    it('ควรโยน NotFoundException หากไม่พบ Category ID หรือถูกลบไปแล้ว', async () => {
      prismaMock.user.findFirst.mockResolvedValue({ id: 1 } as any);
      prismaMock.category.findFirst.mockResolvedValue(null);

      await expect(
        service.create(
          {
            title: 'Post',
            content: 'Content',
            categoryId: 999, // invalid categoryId
          },
          1,
        ),
      ).rejects.toThrow(NotFoundException);
      expect(redisServiceMock.delByPattern).not.toHaveBeenCalled();
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // 2. V1 Test Suite: Ownership & Authorization (update / remove)
  // ─────────────────────────────────────────────────────────────────────────────
  describe('ownership & authorization', () => {
    it('Author สามารถแก้ไขบทความของตัวเองได้ และล้างแคช v2', async () => {
      const existingPost = {
        id: 1,
        title: 'My Post',
        authorId: 10,
        categoryId: 1,
      };
      prismaMock.post.findFirst.mockResolvedValue(existingPost as any);
      prismaMock.post.update.mockResolvedValue({ ...existingPost, title: 'Updated' } as any);

      const result = await service.update(
        1,
        { title: 'Updated' },
        { id: 10, role: 'AUTHOR' as any }, // เจ้าของบทความ
      );

      expect(result.title).toBe('Updated');
      expect(redisServiceMock.delByPattern).toHaveBeenCalledWith('posts:v2:*');
    });

    it('Author ไม่สามารถแก้ไขบทความของคนอื่นได้ (โยน ForbiddenException)', async () => {
      const existingPost = {
        id: 1,
        title: 'Other Post',
        authorId: 10, // บทความของ User 10
        categoryId: 1,
      };
      prismaMock.post.findFirst.mockResolvedValue(existingPost as any);

      // User 99 (AUTHOR) พยายามมาแก้ไขบทความของ User 10
      await expect(
        service.update(
          1,
          { title: 'Hacked' },
          { id: 99, role: 'AUTHOR' as any },
        ),
      ).rejects.toThrow();
      expect(redisServiceMock.delByPattern).not.toHaveBeenCalled();
    });

    it('Admin สามารถแก้ไขบทความของใครก็ได้', async () => {
      const existingPost = {
        id: 1,
        title: 'Author Post',
        authorId: 10,
        categoryId: 1,
      };
      prismaMock.post.findFirst.mockResolvedValue(existingPost as any);
      prismaMock.post.update.mockResolvedValue({ ...existingPost, title: 'Admin Fixed' } as any);

      // User 99 เป็น ADMIN แก้ไขโพสต์ของ User 10
      const result = await service.update(
        1,
        { title: 'Admin Fixed' },
        { id: 99, role: 'ADMIN' as any },
      );

      expect(result.title).toBe('Admin Fixed');
      expect(redisServiceMock.delByPattern).toHaveBeenCalledWith('posts:v2:*');
    });

    it('Author สามารถลบบทความของตนเองได้ (Soft Delete) และล้างแคช v2', async () => {
      const existingPost = {
        id: 1,
        title: 'My Post to Delete',
        authorId: 10,
      };
      prismaMock.post.findFirst.mockResolvedValue(existingPost as any);
      prismaMock.post.update.mockResolvedValue({
        ...existingPost,
        deletedAt: new Date(),
        author: { id: 10, name: 'Author' },
        category: { id: 1, name: 'Tech' },
      } as any);

      await service.remove(1, { id: 10, role: 'AUTHOR' as any });

      expect(prismaMock.post.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 1 },
          data: { deletedAt: expect.any(Date) },
        }),
      );
      expect(redisServiceMock.delByPattern).toHaveBeenCalledWith('posts:v2:*');
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // 2. V1 Test Suite: findOne()
  // ─────────────────────────────────────────────────────────────────────────────
  describe('findOne (v1)', () => {
    it('ควรโยน NotFoundException เมื่อไม่พบบทความหรือถูกลบไปแล้ว', async () => {
      prismaMock.post.findFirst.mockResolvedValue(null);

      await expect(service.findOne(999)).rejects.toThrow(NotFoundException);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // 3. V2 Test Suite: findAllV2() (Pagination, Search & Redis Caching)
  // ─────────────────────────────────────────────────────────────────────────────
  describe('findAllV2 (v2)', () => {
    it('Cache Hit: ควรคืนค่าจาก Redis Cache ทันทีโดยไม่ต้องคิวรี Prisma', async () => {
      const cachedResult = {
        data: [{ id: 1, title: 'Cached Post' }],
        meta: {
          total: 1,
          page: 1,
          limit: 10,
          totalPages: 1,
          hasNextPage: false,
          hasPreviousPage: false,
        },
      };

      // จำลองว่า Redis มีข้อมูลแคชอยู่แล้ว
      redisServiceMock.get.mockResolvedValue(cachedResult);

      const result = await service.findAllV2({ page: 1, limit: 10 });

      expect(result).toEqual(cachedResult);
      // ตรวจสอบว่าดึงแคชด้วย key ที่ถูกต้อง
      expect(redisServiceMock.get).toHaveBeenCalledWith('posts:v2:p1:l10:s:c');
      // ตรวจสอบว่าไม่ได้เรียก Database ผ่าน Prisma เลย!
      expect(prismaMock.post.findMany).not.toHaveBeenCalled();
      expect(prismaMock.post.count).not.toHaveBeenCalled();
    });

    it('Cache Miss: ควรคิวรีฐานข้อมูลและบันทึกลง Redis Cache ด้วย TTL 60 วินาที', async () => {
      // จำลองว่า Redis แคชว่างเปล่า (Cache Miss)
      redisServiceMock.get.mockResolvedValue(null);

      // จำลองว่ามีโพสต์ทั้งหมด 25 รายการในฐานข้อมูล
      prismaMock.post.count.mockResolvedValue(25);
      // จำลองคืนค่าข้อมูล 10 รายการสำหรับหน้า 1
      const mockPosts = Array(10).fill({ id: 1, title: 'Post' });
      prismaMock.post.findMany.mockResolvedValue(mockPosts as any);

      const result = await service.findAllV2({ page: 1, limit: 10 });

      expect(result.data).toHaveLength(10);
      expect(result.meta).toEqual({
        total: 25,
        page: 1,
        limit: 10,
        totalPages: 3,
        hasNextPage: true,
        hasPreviousPage: false,
      });

      // ตรวจสอบว่า skip คำนวณเป็น 0 (หน้า 1) และ take เป็น 10
      expect(prismaMock.post.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          skip: 0,
          take: 10,
        }),
      );

      // ตรวจสอบว่ามีการบันทึกผลลัพธ์ลง Redis Cache พร้อม TTL 60 วินาที
      expect(redisServiceMock.set).toHaveBeenCalledWith(
        'posts:v2:p1:l10:s:c',
        result,
        60,
      );
    });

    it('ควรกำหนด hasNextPage เป็น false เมื่ออยู่หน้าสุดท้าย', async () => {
      redisServiceMock.get.mockResolvedValue(null);
      prismaMock.post.count.mockResolvedValue(25);
      prismaMock.post.findMany.mockResolvedValue(Array(5).fill({ id: 1 }) as any);

      // หน้า 3 (หน้าสุดท้ายจาก 25 รายการ หน้าละ 10)
      const result = await service.findAllV2({ page: 3, limit: 10 });

      expect(result.meta.totalPages).toBe(3);
      expect(result.meta.hasNextPage).toBe(false);
      expect(result.meta.hasPreviousPage).toBe(true);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // 4. V2 Test Suite: findOneV2() (Reading Time & Related Posts)
  // ─────────────────────────────────────────────────────────────────────────────
  describe('findOneV2 (v2)', () => {
    it('ควรคำนวณ readingTimeMinutes และดึงบทความที่เกี่ยวข้อง', async () => {
      // บทความยาว 400 คำ (400 / 200 = 2 นาที)
      const longContent = Array(400).fill('word').join(' ');

      const mockPost = {
        id: 1,
        title: 'Long Article',
        content: longContent,
        categoryId: 5,
        author: { id: 1, name: 'Author' },
        category: { id: 5, name: 'Tech' },
      };
      prismaMock.post.findFirst.mockResolvedValue(mockPost as any);

      const relatedMock = [
        { id: 2, title: 'Related 1', isPublished: true, createdAt: new Date() },
      ];
      prismaMock.post.findMany.mockResolvedValue(relatedMock as any);

      const result = await service.findOneV2(1);

      expect(result.readingTimeMinutes).toBe(2);
      expect(result.relatedPosts).toHaveLength(1);
      expect(result.relatedPosts[0].title).toBe('Related 1');
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // 5. V2 Test Suite: getStatsV2() (Blog Analytics)
  // ─────────────────────────────────────────────────────────────────────────────
  describe('getStatsV2 (v2)', () => {
    it('ควรสรุปยอดสถิติได้อย่างถูกต้อง', async () => {
      // Mock count สำหรับ 4 queries: totalPosts, publishedPosts, totalCategories, totalUsers
      prismaMock.post.count
        .mockResolvedValueOnce(30) // total posts
        .mockResolvedValueOnce(20); // published posts
      prismaMock.category.count.mockResolvedValue(5);
      prismaMock.user.count.mockResolvedValue(10);

      const stats = await service.getStatsV2();

      expect(stats).toEqual({
        totalPosts: 30,
        publishedPosts: 20,
        draftPosts: 10, // 30 - 20 = 10
        totalCategories: 5,
        totalUsers: 10,
      });
    });
  });
});
