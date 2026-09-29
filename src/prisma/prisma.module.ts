import { Global, Module } from '@nestjs/common';
import { PrismaService } from './prisma.service.js';

/**
 * ==============================================================================
 * PrismaModule (Global Database Module)
 * ==============================================================================
 * โมดูลกลางสำหรับให้บริการเชื่อมต่อฐานข้อมูลทั่วทั้งระบบ
 *
 * Backend Concept:
 * 1. `@Global()`: ทำให้ Module นี้เป็น Global Scope
 *    - ปกติใน NestJS เมื่อโมดูลใดต้องการใช้ Service จากอีกโมดูล จะต้องเขียน `imports: [ModuleA]` ในทุกๆ โมดูล
 *    - แต่เมื่อใส่ `@Global()` และ import ใน AppModule เพียงครั้งเดียว โมดูลอื่นๆ (เช่น UsersModule, PostsModule)
 *      จะสามารถเรียกใช้ `PrismaService` ได้ทันทีโดยไม่ต้อง import PrismaModule ซ้ำๆ
 * 2. `providers`: ระบุ Service ที่ถูกสร้างและบริหารจัดการภายใน Module นี้
 * 3. `exports`: ระบุ Service ที่อนุญาตให้ Module อื่นๆ สามารถดึงไปใช้งานได้
 * ==============================================================================
 */
@Global()
@Module({
  providers: [PrismaService],
  exports: [PrismaService],
})
export class PrismaModule {}
