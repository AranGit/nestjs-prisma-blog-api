import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigService } from '@nestjs/config';
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
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const secret = config.get<string>('JWT_SECRET');
        if (!secret) {
          throw new Error('JWT_SECRET environment variable is not set. Application cannot start.');
        }
        return {
          secret,
          signOptions: {
            expiresIn: (config.get<string>('JWT_EXPIRES_IN') || '1h') as any,
          },
        };
      },
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy, RolesGuard],
  exports: [AuthService, PassportModule, JwtModule, JwtStrategy, RolesGuard],
})
export class AuthModule {}
