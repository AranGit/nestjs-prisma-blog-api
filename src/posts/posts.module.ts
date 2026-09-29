import { Module } from '@nestjs/common';
import { PostsService } from './posts.service.js';
import { PostsController } from './posts.controller.js';
import { PostsV2Controller } from './posts-v2.controller.js';

/**
 * ==============================================================================
 * PostsModule (โมดูลจัดการบทความ)
 * ==============================================================================
 * รวมทั้ง Controller v1 และ Controller v2 เข้าไว้ด้วยกันภายใต้ Service เดียว
 *
 * Backend Architecture Concept:
 * - ในระบบจริง Service สามารถเป็นหัวใจหลักในการแชร์ logic ให้กับหลายๆ Version ของ Controller ได้
 * - PostsController (v1) และ PostsV2Controller (v2) ถูกลงทะเบียนใน controllers array พร้อมกัน
 * - NestJS Routing Engine จะแยกแยะ request ไปยัง controller ที่ถูกต้องผ่าน URI Version prefix
 * ==============================================================================
 */
@Module({
  controllers: [PostsController, PostsV2Controller],
  providers: [PostsService],
  exports: [PostsService],
})
export class PostsModule {}
