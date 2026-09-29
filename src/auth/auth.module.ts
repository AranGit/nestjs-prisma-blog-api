import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { AuthService } from './auth.service.js';
import { AuthController } from './auth.controller.js';
import { JwtStrategy } from './strategies/jwt.strategy.js';
import { RolesGuard } from './guards/roles.guard.js';

/**
 * ==============================================================================
 * AuthModule (โมดูลความปลอดภัยและการยืนยันตัวตน)
 * ==============================================================================
 * กำหนดค่าการทำงานของ Passport และ JWT:
 * - Secret Key: ใช้สำหรับลงนามและตรวจสอบความถูกต้องของ Token
 * - Expiration: กำหนดอายุ Token (เช่น '7d' หรือ '24h')
 * ==============================================================================
 */
@Module({
  imports: [
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.register({
      secret: process.env.JWT_SECRET || 'default-super-secret-jwt-key-for-dev',
      signOptions: {
        expiresIn: '7d', // Token มีอายุใช้งานได้ 7 วัน
      },
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy, RolesGuard],
  exports: [AuthService, PassportModule, JwtModule, JwtStrategy, RolesGuard],
})
export class AuthModule {}
