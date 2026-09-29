import { Module } from '@nestjs/common';
import { UsersService } from './users.service.js';
import { UsersController } from './users.controller.js';

/**
 * ==============================================================================
 * UsersModule (โมดูลจัดการผู้ใช้งาน)
 * ==============================================================================
 * รวม Controller และ Service ที่เกี่ยวข้องกับ User Domain เข้าด้วยกัน
 *
 * Backend Concept:
 * - `controllers`: ระบุ Controller ที่ต้องการผูกเข้ากับ Routing Table
 * - `providers`: Service ที่พร้อมให้ Inject ภายใน Module นี้
 * - `exports`: ส่งออก UsersService เพื่อให้โมดูลอื่น (เช่น AuthModule หรือ PostsModule ในอนาคต) นำไปใช้ได้
 * ==============================================================================
 */
@Module({
  controllers: [UsersController],
  providers: [UsersService],
  exports: [UsersService],
})
export class UsersModule {}
