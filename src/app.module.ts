import { Module } from '@nestjs/common';
import { PrismaModule } from './prisma/prisma.module.js';
import { UsersModule } from './users/users.module.js';
import { CategoriesModule } from './categories/categories.module.js';
import { PostsModule } from './posts/posts.module.js';
import { AuthModule } from './auth/auth.module.js';

/**
 * ==============================================================================
 * 🏛️ AppModule (Root Module / โมดูลหลักของแอปพลิเคชัน)
 * ==============================================================================
 * ใน NestJS ทุกอย่างเริ่มต้นจาก Root Module ซึ่งเป็นจุดรวมศูนย์ของ Feature Modules ทั้งหมด
 *
 * 💡 Backend Architecture Concept:
 * - NestJS ใช้แนวคิด Modular Architecture (สถาปัตยกรรมแบบแยกโมดูล)
 * - แต่ละโมดูลรับผิดชอบ Business Domain ของตัวเอง (Users, Categories, Posts, Auth)
 * - `PrismaModule`: โมดูลสำหรับจัดการการเชื่อมต่อฐานข้อมูล
 * - `AuthModule`: โมดูลสำหรับจัดการความปลอดภัย ยืนยันตัวตน และออก JWT Token
 * - `UsersModule`: โมดูลสำหรับจัดการผู้ใช้งาน
 * - `CategoriesModule`: โมดูลสำหรับจัดการหมวดหมู่บทความ
 * - `PostsModule`: โมดูลสำหรับจัดการบทความ (ทั้ง v1 และ v2)
 * ==============================================================================
 */
@Module({
  imports: [
    PrismaModule,     // Database layer (Global module)
    AuthModule,       // Security & Authentication domain
    UsersModule,      // User domain
    CategoriesModule, // Category domain
    PostsModule,      // Post domain (v1 & v2)
  ],
})
export class AppModule {}
