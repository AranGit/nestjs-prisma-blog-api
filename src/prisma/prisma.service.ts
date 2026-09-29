import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

/**
 * ==============================================================================
 * PrismaService (Database Client Wrapper)
 * ==============================================================================
 * ทำหน้าที่เป็นสะพานเชื่อมต่อระหว่าง NestJS และ Prisma ORM
 * Acts as the bridge between NestJS dependency injection and Prisma Client.
 *
 * Backend Concept:
 * 1. `@Injectable()`: ประกาศให้ Class นี้เป็น "Provider" ที่สามารถถูก Inject เข้าไป
 *    ใน Service หรือ Controller อื่นๆ ผ่าน Constructor ได้ (Dependency Injection / IoC)
 * 2. `extends PrismaClient`: สืบทอดความสามารถของ PrismaClient ทำให้ PrismaService
 *    มี method ทุกอย่างในการ Query ฐานข้อมูล (เช่น this.user.findMany, this.post.create)
 * 3. `OnModuleInit` & `OnModuleDestroy`: Lifecycle Hooks ของ NestJS
 *    - `onModuleInit`: ทำงานทันทีเมื่อโมดูลถูกเริ่มต้น -> สั่งเปิด connection กับ DB
 *    - `onModuleDestroy`: ทำงานเมื่อแอปปิดตัวลง -> สั่งปิด connection คืน resource
 * ==============================================================================
 */
@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  /**
   * เปิดการเชื่อมต่อกับ Database เมื่อ Module โหลดเสร็จสมบูรณ์
   * Establishes database connection on module initialization.
   */
  async onModuleInit() {
    await this.$connect();
  }

  /**
   * ปิดการเชื่อมต่อกับ Database อย่างปลอดภัยเมื่อ Application ถูกปิด (Graceful Shutdown)
   * Disconnects cleanly from database when the app terminates.
   */
  async onModuleDestroy() {
    await this.$disconnect();
  }
}
