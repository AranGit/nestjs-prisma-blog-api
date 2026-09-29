import { SetMetadata } from '@nestjs/common';
import { Role } from '@prisma/client';

export const ROLES_KEY = 'roles';

/**
 * ==============================================================================
 * @Roles(...roles: Role[]) Decorator
 * ==============================================================================
 * ใช้ระบุว่า Endpoint นี้อนุญาตให้ Role ใดเข้าถึงได้บ้าง
 * ตัวอย่างการใช้งาน:
 * `@Roles(Role.ADMIN)`
 * `@Roles(Role.ADMIN, Role.AUTHOR)`
 *
 * Backend Concept:
 * - `SetMetadata`: นำ array ของ Role ไปฝังไว้ใน Handler Metadata
 * - `RolesGuard` จะใช้ `Reflector` อ่านค่า metadata นี้ในภายหลัง เพื่อนำไปตรวจสอบสิทธิ์
 * ==============================================================================
 */
export const Roles = (...roles: Role[]) => SetMetadata(ROLES_KEY, roles);
