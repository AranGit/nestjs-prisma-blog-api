import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { PrismaService } from '../../prisma/prisma.service.js';
import { Role } from '@prisma/client';

export interface JwtPayload {
  sub: number;
  email: string;
  role: Role;
}

/**
 * ==============================================================================
 * 🔑 JwtStrategy (Passport Strategy สำหรับถอดรหัสและตรวจสอบ JWT)
 * ==============================================================================
 * Passport จะเรียกใช้ Strategy นี้เมื่อมี Request วิ่งผ่าน `JwtAuthGuard`
 *
 * 💡 Backend Concept:
 * 1. `jwtFromRequest`: ดึง Token จาก `Authorization: Bearer <token>`
 * 2. `secretOrKey`: คีย์ลับที่ใช้ Verify ลายเซ็นดิจิทัล (Digital Signature) ของ Token
 * 3. `validate(payload)`: ทำงานหลังจาก Token ผ่านการ Verify ลายเซ็นแล้ว
 *    - เราตรวจสอบกับ Database ซ้ำเพื่อให้มั่นใจว่า User บัญชีนี้ยังไม่ถูกลบออกจากระบบ
 *    - สิ่งที่ return จาก validate() จะถูกแปะเข้าที่ `req.user` อัตโนมัติ
 * ==============================================================================
 */
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private readonly prisma: PrismaService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: process.env.JWT_SECRET || 'default-super-secret-jwt-key-for-dev',
    });
  }

  async validate(payload: JwtPayload) {
    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
      },
    });

    if (!user) {
      throw new UnauthorizedException('User account no longer exists');
    }

    return user;
  }
}
