import { Test, TestingModule } from '@nestjs/testing';
import { describe, it, expect, beforeEach } from 'vitest';
import { mockDeep, DeepMockProxy } from 'vitest-mock-extended';
import { PrismaClient } from '@prisma/client';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { CategoriesService } from './categories.service.js';
import { PrismaService } from '../prisma/prisma.service.js';

/**
 * ==============================================================================
 * Unit Tests: CategoriesService
 * ==============================================================================
 * สอนการทำ Unit Testing สำหรับ Service ใน NestJS ด้วย Vitest และ Mocking
 *
 * Core Testing Concepts (หลักการสำคัญของการทดสอบ):
 * 1. Isolation (การแยกส่วนทดสอบ):
 *    - เราต้องการทดสอบ Business Logic ใน `CategoriesService` เท่านั้น
 *    - เราจึงไม่ต่อ Database จริง แต่ใช้ `mockDeep<PrismaClient>()` จำลองคำสั่ง Prisma
 * 2. AAA Pattern (Arrange - Act - Assert):
 *    - **Arrange**: เตรียมข้อมูลจำลองและพฤติกรรมของ Mock (mockResolvedValue)
 *    - **Act**: เรียกฟังก์ชันของ Service ที่เราต้องการทดสอบ
 *    - **Assert**: ตรวจสอบผลลัพธ์ว่าตรงกับที่คาดหวังหรือไม่ (expect)
 * ==============================================================================
 */
describe('CategoriesService', () => {
  let service: CategoriesService;
  let prismaMock: DeepMockProxy<PrismaClient>;

  beforeEach(async () => {
    // สร้าง Deep Mock สำหรับ PrismaClient (จำลองทุก method เช่น findUnique, create, etc.)
    prismaMock = mockDeep<PrismaClient>();

    // สร้าง Testing Module ของ NestJS โดยแทนที่ PrismaService ด้วย Mock
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CategoriesService,
        {
          provide: PrismaService,
          useValue: prismaMock,
        },
      ],
    }).compile();

    service = module.get<CategoriesService>(CategoriesService);
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // 1. Test Suite: create()
  // ─────────────────────────────────────────────────────────────────────────────
  describe('create', () => {
    it('ควรสร้างหมวดหมู่สำเร็จเมื่อชื่อยังไม่เคยมีในระบบ', async () => {
      // [Arrange] จำลองว่า findUnique หาไม่เจอ (null) แปลว่าชื่อไม่ซ้ำ
      prismaMock.category.findUnique.mockResolvedValue(null);

      const mockCreatedCategory = {
        id: '019245bb-8e34-7389-9a74-9f8263590001',
        name: 'Technology',
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
      };
      prismaMock.category.create.mockResolvedValue(mockCreatedCategory);

      // [Act] เรียกฟังก์ชัน create
      const result = await service.create({ name: 'Technology' });

      // [Assert] ตรวจสอบผลลัพธ์
      expect(result).toEqual(mockCreatedCategory);
      expect(prismaMock.category.create).toHaveBeenCalledWith({
        data: { name: 'Technology' },
      });
    });

    it('ควรโยน ConflictException (409) หากชื่อหมวดหมู่ซ้ำในระบบ', async () => {
      // [Arrange] จำลองว่ามีชื่อ 'Technology' อยู่แล้วในระบบ
      prismaMock.category.findUnique.mockResolvedValue({
        id: '019245bb-8e34-7389-9a74-9f8263590001',
        name: 'Technology',
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
      });

      // [Act & Assert] เมื่อชื่อซ้ำ ต้อง throw ConflictException
      await expect(service.create({ name: 'Technology' })).rejects.toThrow(
        ConflictException,
      );
      // ยืนยันว่า create จะต้องไม่ถูกเรียกเลย
      expect(prismaMock.category.create).not.toHaveBeenCalled();
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // 2. Test Suite: findAll()
  // ─────────────────────────────────────────────────────────────────────────────
  describe('findAll', () => {
    it('ควรคืนค่ารายการหมวดหมู่ทั้งหมดพร้อมการนับจำนวนบทความ', async () => {
      const mockCategories = [
        {
          id: '019245bb-8e34-7389-9a74-9f8263590001',
          name: 'Design',
          createdAt: new Date(),
          updatedAt: new Date(),
          _count: { posts: 3 },
        },
        {
          id: '019245bb-8e34-7389-9a74-9f8263590002',
          name: 'Technology',
          createdAt: new Date(),
          updatedAt: new Date(),
          _count: { posts: 7 },
        },
      ];
      prismaMock.category.findMany.mockResolvedValue(mockCategories as any);

      const result = await service.findAll();

      expect(result).toHaveLength(2);
      expect(result[0].name).toBe('Design');
      expect(prismaMock.category.findMany).toHaveBeenCalledWith({
        where: { deletedAt: null },
        include: {
          _count: {
            select: {
              posts: {
                where: { deletedAt: null },
              },
            },
          },
        },
        orderBy: { name: 'asc' },
      });
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // 3. Test Suite: findOne()
  // ─────────────────────────────────────────────────────────────────────────────
  describe('findOne', () => {
    it('ควรคืนค่าหมวดหมู่เมื่อพบข้อมูลตาม ID', async () => {
      const mockCategory = {
        id: '019245bb-8e34-7389-9a74-9f8263590001',
        name: 'Technology',
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
        posts: [],
      };
      prismaMock.category.findFirst.mockResolvedValue(mockCategory as any);

      const result = await service.findOne('019245bb-8e34-7389-9a74-9f8263590001');

      expect(result).toEqual(mockCategory);
      expect(result.id).toBe('019245bb-8e34-7389-9a74-9f8263590001');
    });

    it('ควรโยน NotFoundException (404) เมื่อไม่พบหมวดหมู่ตาม ID หรือถูกลบไปแล้ว', async () => {
      prismaMock.category.findFirst.mockResolvedValue(null);

      await expect(service.findOne('019245bb-8e34-7389-9a74-9f8263590999')).rejects.toThrow(NotFoundException);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // 4. Test Suite: update()
  // ─────────────────────────────────────────────────────────────────────────────
  describe('update', () => {
    it('ควรโยน ConflictException หากเปลี่ยนชื่อไปซ้ำกับหมวดหมู่อื่น', async () => {
      // 1. หมวดหมู่ปัจจุบัน (id: '019245bb-8e34-7389-9a74-9f8263590001', name: 'Old')
      prismaMock.category.findFirst.mockResolvedValueOnce({
        id: '019245bb-8e34-7389-9a74-9f8263590001',
        name: 'Old',
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
        posts: [],
      } as any);
      // 2. มีหมวดหมู่อื่น (id: '019245bb-8e34-7389-9a74-9f8263590002') ที่ใช้ชื่อ 'DuplicateName' อยู่แล้ว
      prismaMock.category.findUnique.mockResolvedValueOnce({
        id: '019245bb-8e34-7389-9a74-9f8263590002',
        name: 'DuplicateName',
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
      });

      await expect(
        service.update('019245bb-8e34-7389-9a74-9f8263590001', { name: 'DuplicateName' }),
      ).rejects.toThrow(ConflictException);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // 5. Test Suite: remove()
  // ─────────────────────────────────────────────────────────────────────────────
  describe('remove', () => {
    it('ควรทำ Soft Delete หมวดหมู่สำเร็จเมื่อไม่มีบทความผูกอยู่', async () => {
      prismaMock.category.findFirst.mockResolvedValue({
        id: '019245bb-8e34-7389-9a74-9f8263590001',
        name: 'Technology',
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
        posts: [],
      } as any);
      // ไม่มี Active Post ผูกอยู่
      prismaMock.post.count.mockResolvedValue(0);
      prismaMock.category.update.mockResolvedValue({
        id: '019245bb-8e34-7389-9a74-9f8263590001',
        name: 'Technology',
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: new Date(),
      } as any);

      const result = await service.remove('019245bb-8e34-7389-9a74-9f8263590001');

      expect(result.id).toBe('019245bb-8e34-7389-9a74-9f8263590001');
      expect(prismaMock.category.update).toHaveBeenCalledWith({
        where: { id: '019245bb-8e34-7389-9a74-9f8263590001' },
        data: { deletedAt: expect.any(Date) },
      });
    });

    it('ควรโยน ConflictException หากยังมีบทความที่ Active ผูกอยู่กับหมวดหมู่ (Soft Restrict)', async () => {
      prismaMock.category.findFirst.mockResolvedValue({
        id: '019245bb-8e34-7389-9a74-9f8263590001',
        name: 'Technology',
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
        posts: [],
      } as any);
      // มี Active Post ผูกอยู่ 2 บทความ
      prismaMock.post.count.mockResolvedValue(2);

      await expect(service.remove('019245bb-8e34-7389-9a74-9f8263590001')).rejects.toThrow(ConflictException);
      expect(prismaMock.category.update).not.toHaveBeenCalled();
    });
  });
});
