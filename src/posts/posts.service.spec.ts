import { Test, TestingModule } from '@nestjs/testing';
import { describe, it, expect, beforeEach } from 'vitest';
import { mockDeep, DeepMockProxy } from 'vitest-mock-extended';
import { PrismaClient } from '@prisma/client';
import { NotFoundException } from '@nestjs/common';
import { PostsService } from './posts.service.js';
import { PrismaService } from '../prisma/prisma.service.js';

/**
 * ==============================================================================
 * 🧪 Unit Tests: PostsService (V1 & V2)
 * ==============================================================================
 * ทดสอบทั้ง V1 CRUD และ V2 Advanced Logic (Pagination, Reading Time, Stats)
 *
 * 💡 Focus Areas:
 * 1. Foreign Key Verification: ตรวจสอบ Author และ Category ก่อน Create
 * 2. V2 Pagination Metadata: ทดสอบการคำนวณ totalPages, hasNextPage, hasPreviousPage
 * 3. V2 Calculated Attributes: ทดสอบการคำนวณ readingTimeMinutes จากจำนวนคำ
 * ==============================================================================
 */
describe('PostsService', () => {
  let service: PostsService;
  let prismaMock: DeepMockProxy<PrismaClient>;

  beforeEach(async () => {
    prismaMock = mockDeep<PrismaClient>();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PostsService,
        {
          provide: PrismaService,
          useValue: prismaMock,
        },
      ],
    }).compile();

    service = module.get<PostsService>(PostsService);
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // 1. V1 Test Suite: create()
  // ─────────────────────────────────────────────────────────────────────────────
  describe('create (v1)', () => {
    it('ควรสร้างบทความสำเร็จเมื่อ Author และ Category มีอยู่จริง', async () => {
      // 1. Author มีอยู่จริง
      prismaMock.user.findUnique.mockResolvedValue({ id: 1 } as any);
      // 2. Category มีอยู่จริง
      prismaMock.category.findUnique.mockResolvedValue({ id: 2 } as any);

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

      const result = await service.create({
        title: 'Mastering NestJS',
        content: 'Content here...',
        isPublished: true,
        authorId: 1,
        categoryId: 2,
      });

      expect(result.id).toBe(10);
      expect(result.author.name).toBe('John Doe');
      expect(prismaMock.post.create).toHaveBeenCalledOnce();
    });

    it('ควรโยน NotFoundException หากไม่พบ Author ID', async () => {
      prismaMock.user.findUnique.mockResolvedValue(null);

      await expect(
        service.create({
          title: 'Post',
          content: 'Content',
          authorId: 999,
          categoryId: 1,
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it('ควรโยน NotFoundException หากไม่พบ Category ID', async () => {
      prismaMock.user.findUnique.mockResolvedValue({ id: 1 } as any);
      prismaMock.category.findUnique.mockResolvedValue(null);

      await expect(
        service.create({
          title: 'Post',
          content: 'Content',
          authorId: 1,
          categoryId: 999,
        }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // 2. V1 Test Suite: findOne()
  // ─────────────────────────────────────────────────────────────────────────────
  describe('findOne (v1)', () => {
    it('ควรโยน NotFoundException เมื่อไม่พบบทความ', async () => {
      prismaMock.post.findUnique.mockResolvedValue(null);

      await expect(service.findOne(999)).rejects.toThrow(NotFoundException);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // 3. V2 Test Suite: findAllV2() (Pagination & Search)
  // ─────────────────────────────────────────────────────────────────────────────
  describe('findAllV2 (v2)', () => {
    it('ควรคำนวณ Pagination Metadata ได้ถูกต้อง', async () => {
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
    });

    it('ควรกำหนด hasNextPage เป็น false เมื่ออยู่หน้าสุดท้าย', async () => {
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
      prismaMock.post.findUnique.mockResolvedValue(mockPost as any);

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
