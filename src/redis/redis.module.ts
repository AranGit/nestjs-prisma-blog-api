import { Global, Module } from '@nestjs/common';
import { RedisService } from './redis.service.js';

/**
 * ==============================================================================
 * 📦 RedisModule (Global Cache Module)
 * ==============================================================================
 * ให้บริการเชื่อมต่อและแคชข้อมูลด้วย Redis สำหรับทุก Module ทั่วทั้งแอปพลิเคชัน
 * ==============================================================================
 */
@Global()
@Module({
  providers: [RedisService],
  exports: [RedisService],
})
export class RedisModule {}
