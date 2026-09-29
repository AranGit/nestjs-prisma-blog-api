import { Test, TestingModule } from '@nestjs/testing';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { mockDeep, DeepMockProxy } from 'vitest-mock-extended';
import { PrismaClient, Role } from '@prisma/client';
import { JwtService } from '@nestjs/jwt';
import { ConflictException, UnauthorizedException } from '@nestjs/common';
import bcrypt from 'bcrypt';
import { AuthService } from './auth.service.js';
import { PrismaService } from '../prisma/prisma.service.js';

/**
 * ==============================================================================
 * Unit Tests: AuthService
 * ==============================================================================
 * ทดสอบตรรกะความปลอดภัยทั้งหมด:
 * 1. Register: ตรวจสอบการแฮชรหัสผ่าน และป้องกันอีเมลซ้ำ
 * 2. Login: ตรวจสอบการเทียบรหัสผ่าน (bcrypt.compare) และการสร้าง JWT Token
 * 3. Profile: ตรวจสอบการดึงข้อมูลส่วนตัว
 * ==============================================================================
 */
describe('AuthService', () => {
  let service: AuthService;
  let prismaMock: DeepMockProxy<PrismaClient>;
  let jwtServiceMock: { signAsync: any };

  beforeEach(async () => {
    prismaMock = mockDeep<PrismaClient>();
    jwtServiceMock = {
      signAsync: vi.fn().mockResolvedValue('mocked-jwt-token'),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: PrismaService,
          useValue: prismaMock,
        },
        {
          provide: JwtService,
          useValue: jwtServiceMock,
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // 1. Test Suite: register()
  // ─────────────────────────────────────────────────────────────────────────────
  describe('register', () => {
    it('ควรแฮชรหัสผ่าน สร้างผู้ใช้ใหม่ และออก JWT Token สำเร็จ', async () => {
      // 1. Arrange: ไม่มีอีเมลซ้ำในระบบ
      prismaMock.user.findUnique.mockResolvedValue(null);

      const mockCreatedUser = {
        id: 1,
        email: 'author@example.com',
        name: 'Author One',
        role: Role.AUTHOR,
      };
      prismaMock.user.create.mockResolvedValue(mockCreatedUser as any);

      // 2. Act
      const result = await service.register({
        name: 'Author One',
        email: 'author@example.com',
        password: 'plainPassword123',
      });

      // 3. Assert
      expect(result.accessToken).toBe('mocked-jwt-token');
      expect(result.user.email).toBe('author@example.com');
      expect(jwtServiceMock.signAsync).toHaveBeenCalledWith({
        sub: 1,
        email: 'author@example.com',
        role: Role.AUTHOR,
      });

      // ตรวจสอบว่า password ที่ส่งไปบันทึกใน create ถูกแฮชแล้ว (ไม่ใช่ plain text)
      const createCall = prismaMock.user.create.mock.calls[0][0];
      expect(createCall.data.password).not.toBe('plainPassword123');
      expect(createCall.data.password.length).toBeGreaterThan(20);
    });

    it('ควรโยน ConflictException (409) หากอีเมลมีผู้ใช้งานแล้ว', async () => {
      prismaMock.user.findUnique.mockResolvedValue({ id: 1 } as any);

      await expect(
        service.register({
          name: 'Duplicate User',
          email: 'duplicate@example.com',
          password: 'password123',
        }),
      ).rejects.toThrow(ConflictException);

      expect(prismaMock.user.create).not.toHaveBeenCalled();
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // 2. Test Suite: login()
  // ─────────────────────────────────────────────────────────────────────────────
  describe('login', () => {
    it('ควรเข้าสู่ระบบสำเร็จเมื่อระบุ email และ password ถูกต้อง', async () => {
      const hashedPassword = await bcrypt.hash('correctPassword', 10);
      prismaMock.user.findUnique.mockResolvedValue({
        id: 1,
        email: 'john@example.com',
        password: hashedPassword,
        name: 'John Doe',
        role: Role.ADMIN,
      } as any);

      const result = await service.login({
        email: 'john@example.com',
        password: 'correctPassword',
      });

      expect(result.accessToken).toBe('mocked-jwt-token');
      expect(result.user.role).toBe(Role.ADMIN);
      expect(jwtServiceMock.signAsync).toHaveBeenCalledWith({
        sub: 1,
        email: 'john@example.com',
        role: Role.ADMIN,
      });
    });

    it('ควรโยน UnauthorizedException (401) เมื่อไม่พบผู้ใช้นี้ในระบบ', async () => {
      prismaMock.user.findUnique.mockResolvedValue(null);

      await expect(
        service.login({
          email: 'notfound@example.com',
          password: 'password123',
        }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('ควรโยน UnauthorizedException (401) เมื่อรหัสผ่านไม่ตรงกัน', async () => {
      const hashedPassword = await bcrypt.hash('realPassword', 10);
      prismaMock.user.findUnique.mockResolvedValue({
        id: 1,
        email: 'john@example.com',
        password: hashedPassword,
        name: 'John Doe',
        role: Role.AUTHOR,
      } as any);

      await expect(
        service.login({
          email: 'john@example.com',
          password: 'wrongPassword',
        }),
      ).rejects.toThrow(UnauthorizedException);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // 3. Test Suite: getProfile()
  // ─────────────────────────────────────────────────────────────────────────────
  describe('getProfile', () => {
    it('ควรคืนค่าข้อมูล Profile ของผู้ใช้', async () => {
      const mockProfile = {
        id: 1,
        email: 'john@example.com',
        name: 'John Doe',
        role: Role.AUTHOR,
        createdAt: new Date(),
      };
      prismaMock.user.findUnique.mockResolvedValue(mockProfile as any);

      const result = await service.getProfile(1);

      expect(result).toEqual(mockProfile);
    });

    it('ควรโยน UnauthorizedException หากไม่พบ User บัญชีนี้', async () => {
      prismaMock.user.findUnique.mockResolvedValue(null);

      await expect(service.getProfile(999)).rejects.toThrow(UnauthorizedException);
    });
  });
});
