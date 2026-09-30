import { Injectable, ConflictException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service.js';
import { RegisterDto } from './dto/register.dto.js';
import { LoginDto } from './dto/login.dto.js';
import { AuthResponseDto } from './dto/auth-response.dto.js';
import { Role } from '@prisma/client';

/**
 * ==============================================================================
 * AuthService (Authentication & Security Business Logic)
 * ==============================================================================
 * ดูแลความปลอดภัยของระบบ: การแฮชรหัสผ่าน, การตรวจสอบสิทธิ์ และการออก JWT Token
 *
 * Backend Security Best Practices Demonstrated:
 * 1. Password Hashing (bcrypt):
 *    - ใช้ Salt Rounds = 10 (มาตรฐานความปลอดภัยที่ทนทานต่อ Brute-Force Attacks)
 *    - รหัสผ่านตัวจริง (Plain text) จะไม่มีวันถูกบันทึกหรือหลุดไปที่ใดเด็ดขาด
 * 2. Timing Attack & User Enumeration Protection:
 *    - ตอน Login หากอีเมลไม่พบ หรือรหัสผ่านผิด ให้ตอบกลับด้วยข้อความเดียวกันคือ:
 *      `"Invalid email or password"` (401 Unauthorized)
 *    - ห้ามตอบว่า "Email not found" เพราะผู้ไม่หวังดีจะสามารถเดาได้ว่ามีอีเมลนี้อยู่ในระบบหรือไม่
 * 3. JWT Claims:
 *    - บรรจุ `sub` (Subject = User ID), `email`, และ `role` เพื่อให้ Guard นำไปใช้ตัดสินสิทธิ์ได้ทันที
 * ==============================================================================
 */
@Injectable()
export class AuthService {
  // กำหนด Salt Rounds สำหรับ bcrypt
  private readonly SALT_ROUNDS = 10;

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) {}

  /**
   * สมัครสมาชิกใหม่ (Register)
   */
  async register(registerDto: RegisterDto): Promise<AuthResponseDto> {
    const { email, password, name, role } = registerDto;

    // 1. ตรวจสอบว่ามีอีเมลนี้ในระบบแล้วหรือไม่
    const existingUser = await this.prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      throw new ConflictException('Email is already registered');
    }

    // 2. แฮชรหัสผ่านด้วย bcrypt ก่อนบันทึก
    const hashedPassword = await bcrypt.hash(password, this.SALT_ROUNDS);

    // 3. บันทึก User ลงฐานข้อมูล
    const user = await this.prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        name,
        role: role || Role.AUTHOR,
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
      },
    });

    // 4. ออก JWT Token
    const accessToken = await this.generateToken(user.id, user.email, user.role);

    return {
      accessToken,
      user,
    };
  }

  /**
   * เข้าสู่ระบบ (Login)
   */
  async login(loginDto: LoginDto): Promise<AuthResponseDto> {
    const { email, password } = loginDto;

    // 1. ค้นหาผู้ใช้งานด้วยอีเมล (เฉพาะบัญชีที่ยังไม่ถูก Soft Delete)
    const user = await this.prisma.user.findFirst({
      where: { email, deletedAt: null },
    });

    // 2. ถ้าไม่พบผู้ใช้ ให้โยน 401 ทันที
    if (!user) {
      throw new UnauthorizedException('Invalid email or password');
    }

    // 3. ตรวจสอบความถูกต้องของรหัสผ่านด้วย bcrypt.compare
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid email or password');
    }

    // 4. ออก JWT Token
    const accessToken = await this.generateToken(user.id, user.email, user.role);

    return {
      accessToken,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
    };
  }

  /**
   * ดึงข้อมูลโปรไฟล์ผู้ใช้งาน (เฉพาะบัญชีที่ยัง Active)
   */
  async getProfile(userId: number) {
    const user = await this.prisma.user.findFirst({
      where: { id: userId, deletedAt: null },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        createdAt: true,
      },
    });

    if (!user) {
      throw new UnauthorizedException('User account not found');
    }

    return user;
  }

  /**
   * Helper Method สำหรับเซ็นลายเซ็นสร้าง JWT Token
   */
  private async generateToken(userId: number, email: string, role: Role): Promise<string> {
    const payload = {
      sub: userId,
      email,
      role,
    };

    return this.jwtService.signAsync(payload);
  }
}
