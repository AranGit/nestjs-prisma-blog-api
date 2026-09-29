import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

/**
 * ==============================================================================
 * 🛡️ JwtAuthGuard (Guard ตรวจสอบ JWT Bearer Token)
 * ==============================================================================
 * สกัดและตรวจสอบ JWT Token จาก Authorization Header: "Bearer <token>"
 *
 * 💡 Backend Concept:
 * - สืบทอดความสามารถจาก `AuthGuard('jwt')` ของ `@nestjs/passport`
 * - หาก Token ถูกต้อง จะเรียก `JwtStrategy.validate()` และแนบ user object เข้าสู่ `req.user`
 * - หาก Token หมดอายุ, ปลอมแปลง, หรือไม่ได้ส่งมา จะตอบกลับเป็น 401 Unauthorized ทันที
 * ==============================================================================
 */
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {}
