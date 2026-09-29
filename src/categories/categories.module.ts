import { Module } from '@nestjs/common';
import { CategoriesService } from './categories.service.js';
import { CategoriesController } from './categories.controller.js';

/**
 * ==============================================================================
 * CategoriesModule (โมดูลจัดการหมวดหมู่)
 * ==============================================================================
 * ห่อหุ้ม CategoriesController และ CategoriesService ไว้ใน Module เดียวกัน
 * และ export CategoriesService ออกไปเพื่อให้ PostsService สามารถตรวจสอบหมวดหมู่ได้
 * ==============================================================================
 */
@Module({
  controllers: [CategoriesController],
  providers: [CategoriesService],
  exports: [CategoriesService],
})
export class CategoriesModule {}
