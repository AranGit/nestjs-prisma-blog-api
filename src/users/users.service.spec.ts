import { Test, TestingModule } from '@nestjs/testing';
import { describe, it, expect, beforeEach } from 'vitest';
import { mockDeep, DeepMockProxy } from 'vitest-mock-extended';
import { PrismaClient, Role } from '@prisma/client';
import { ConflictException, NotFoundException, ForbiddenException } from '@nestjs/common';
import { UsersService } from './users.service.js';
import { PrismaService } from '../prisma/prisma.service.js';

/**
 * ==============================================================================
 * Unit Tests: UsersService
 * ==============================================================================
 * ทดสอบตรรกะทางธุรกิจของระบบจัดการผู้ใช้งาน
 *
 * Focus Areas:
 * 1. Data Masking: ยืนยันว่าการตอบกลับไม่มีรหัสผ่าน (password) ติดไปด้วย
 * 2. Duplicate Email Prevention: ป้องกันการสมัครด้วยอีเมลซ้ำ
 * 3. Cascade/Relation Queries: การดึงบทความที่ผู้ใช้เป็นคนเขียน
 * ==============================================================================
 */
describe('UsersService', () => {
  let service: UsersService;
  let prismaMock: DeepMockProxy<PrismaClient>;

  beforeEach(async () => {
    prismaMock = mockDeep<PrismaClient>();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        {
          provide: PrismaService,
          useValue: prismaMock,
        },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // 1. Test Suite: create()
  // ─────────────────────────────────────────────────────────────────────────────
  describe('create', () => {
    it('ควรสร้างผู้ใช้งานสำเร็จและไม่คืนค่า password กลับไป', async () => {
      prismaMock.user.findUnique.mockResolvedValue(null);

      const mockCreatedUser = {
        id: 1,
        email: 'john@example.com',
        name: 'John Doe',
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      prismaMock.user.create.mockResolvedValue(mockCreatedUser as any);

      const result = await service.create({
        email: 'john@example.com',
        password: 'password123',
        name: 'John Doe',
      });

      expect(result).toEqual(mockCreatedUser);
      expect((result as any).password).toBeUndefined();
      expect(prismaMock.user.create).toHaveBeenCalledOnce();
    });

    it('ควรโยน ConflictException (409) เมื่ออีเมลซ้ำ', async () => {
      prismaMock.user.findUnique.mockResolvedValue({
        id: '019245bb-8e34-7389-9a74-9f8263590001',
        email: 'john@example.com',
        password: 'hashedPassword',
        name: 'John Doe',
        role: Role.AUTHOR,
        deletedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      await expect(
        service.create({
          email: 'john@example.com',
          password: 'password123',
          name: 'John Doe',
        }),
      ).rejects.toThrow(ConflictException);

      expect(prismaMock.user.create).not.toHaveBeenCalled();
    });

    it('ควรส่งต่อ role ไปยัง prisma.user.create เมื่อมีการระบุ role เช่น ADMIN', async () => {
      prismaMock.user.findUnique.mockResolvedValue(null);

      const mockAdminUser = {
        id: '019245bb-8e34-7389-9a74-9f8263590002',
        email: 'admin@example.com',
        name: 'Admin User',
        role: Role.ADMIN,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      prismaMock.user.create.mockResolvedValue(mockAdminUser as any);

      const result = await service.create({
        email: 'admin@example.com',
        password: 'password123',
        name: 'Admin User',
        role: Role.ADMIN,
      });

      expect(result.role).toBe(Role.ADMIN);
      expect(prismaMock.user.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            email: 'admin@example.com',
            role: Role.ADMIN,
          }),
        }),
      );
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // 2. Test Suite: findAll()
  // ─────────────────────────────────────────────────────────────────────────────
  describe('findAll', () => {
    it('ควรคืนค่าผู้ใช้ทั้งหมดเฉพาะที่ยังไม่ถูก Soft Delete', async () => {
      const mockUsers = [
        { id: '019245bb-8e34-7389-9a74-9f8263590001', email: 'user1@example.com', name: 'User 1', createdAt: new Date(), updatedAt: new Date() },
        { id: '019245bb-8e34-7389-9a74-9f8263590002', email: 'user2@example.com', name: 'User 2', createdAt: new Date(), updatedAt: new Date() },
      ];
      prismaMock.user.findMany.mockResolvedValue(mockUsers as any);

      const result = await service.findAll();

      expect(result).toHaveLength(2);
      expect(result[0].email).toBe('user1@example.com');
      expect(prismaMock.user.findMany).toHaveBeenCalledWith({
        where: { deletedAt: null },
        take: 100,
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          createdAt: true,
          updatedAt: true,
        },
      });
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // 3. Test Suite: findOne()
  // ─────────────────────────────────────────────────────────────────────────────
  describe('findOne', () => {
    it('ควรคืนค่าผู้ใช้พร้อมรายการบทความที่เขียน', async () => {
      const mockUserWithPosts = {
        id: '019245bb-8e34-7389-9a74-9f8263590001',
        email: 'john@example.com',
        name: 'John Doe',
        createdAt: new Date(),
        updatedAt: new Date(),
        posts: [{ id: '019245bb-8e34-7389-9a74-9f8263590101', title: 'My First Post', isPublished: true, createdAt: new Date() }],
      };
      prismaMock.user.findFirst.mockResolvedValue(mockUserWithPosts as any);

      const result = await service.findOne('019245bb-8e34-7389-9a74-9f8263590001');

      expect(result).toEqual(mockUserWithPosts);
      expect(result.posts).toHaveLength(1);
      expect(prismaMock.user.findFirst).toHaveBeenCalledWith({
        where: { id: '019245bb-8e34-7389-9a74-9f8263590001', deletedAt: null },
        select: expect.objectContaining({
          id: true,
          email: true,
        }),
      });
    });

    it('ควรโยน NotFoundException เมื่อไม่พบ User ID หรือถูกลบไปแล้ว', async () => {
      prismaMock.user.findFirst.mockResolvedValue(null);

      await expect(service.findOne('019245bb-8e34-7389-9a74-9f8263590999')).rejects.toThrow(NotFoundException);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // 4. Test Suite: update() & remove()
  // ─────────────────────────────────────────────────────────────────────────────
  describe('update', () => {
    it('ควรอัปเดตข้อมูลผู้ใช้สำเร็จ', async () => {
      prismaMock.user.findFirst.mockResolvedValue({
        id: '019245bb-8e34-7389-9a74-9f8263590001',
        email: 'john@example.com',
        name: 'John Doe',
        createdAt: new Date(),
        updatedAt: new Date(),
        posts: [],
      } as any);

      const updatedUser = {
        id: '019245bb-8e34-7389-9a74-9f8263590001',
        email: 'john.new@example.com',
        name: 'John Updated',
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      prismaMock.user.update.mockResolvedValue(updatedUser as any);

      const result = await service.update(
        '019245bb-8e34-7389-9a74-9f8263590001',
        { name: 'John Updated' },
        { id: '019245bb-8e34-7389-9a74-9f8263590001', role: Role.AUTHOR },
      );

      expect(result.name).toBe('John Updated');
    });

    it('ควรโยน ForbiddenException เมื่อผู้ใช้พยายามแก้ไขโปรไฟล์ของคนอื่น', async () => {
      await expect(
        service.update(
          '019245bb-8e34-7389-9a74-9f8263590002',
          { name: 'Hacked Name' },
          { id: '019245bb-8e34-7389-9a74-9f8263590001', role: Role.AUTHOR },
        ),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('remove', () => {
    it('ควรทำ Soft Cascade ลบทั้งผู้ใช้และบทความของผู้ใช้ผ่าน Transaction สำเร็จ', async () => {
      prismaMock.user.findFirst.mockResolvedValue({
        id: '019245bb-8e34-7389-9a74-9f8263590001',
        email: 'john@example.com',
        name: 'John Doe',
        createdAt: new Date(),
        updatedAt: new Date(),
        posts: [],
      } as any);

      const mockDeletedUser = {
        id: '019245bb-8e34-7389-9a74-9f8263590001',
        email: 'john@example.com',
        name: 'John Doe',
      };
      prismaMock.$transaction.mockResolvedValue([mockDeletedUser, { count: 3 }] as any);

      const result = await service.remove('019245bb-8e34-7389-9a74-9f8263590001');

      expect(result.id).toBe('019245bb-8e34-7389-9a74-9f8263590001');
      expect(prismaMock.$transaction).toHaveBeenCalledOnce();
    });
  });
});
