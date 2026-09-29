import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Role } from '@prisma/client';
import { ROLES_KEY } from '../decorators/roles.decorator.js';

/**
 * ==============================================================================
 * RolesGuard (Guard ตรวจสอบสิทธิ์ตามบทบาท - Role-Based Access Control)
 * ==============================================================================
 * ตรวจสอบว่าผู้ใช้ที่ล็อกอินอยู่มี Role ตรงกับที่กำหนดไว้ใน `@Roles(...)` หรือไม่
 *
 * Backend Concept:
 * 1. `Reflector`: เครื่องมือของ NestJS ที่ใช้อ่าน metadata ที่เราแปะไว้ด้วย `@Roles(...)`
 * 2. ตรวจสอบว่า Handler หรือ Controller มีการกำหนด `@Roles(...)` หรือไม่
 *    - ถ้าไม่มี: อนุญาตให้ผ่านได้ (Public หรือไม่จำกัด Role)
 *    - ถ้ามี: ตรวจสอบว่า `user.role` ตรงกับหนึ่งใน Role ที่อนุญาตหรือไม่
 *    - ถ้าไม่ตรง: โยน ForbiddenException (403 Forbidden)
 * ==============================================================================
 */
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    // ดึง roles ที่ระบุไว้จาก Handler (Method) หรือ Class (Controller)
    const requiredRoles = this.reflector.getAllAndOverride<Role[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    // หาก endpoint ไม่ได้ระบุ @Roles(...) แสดงว่าใครก็เข้าถึงได้
    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    // ถ้าไม่มี user หรือ role ไม่ตรง ให้ปฏิเสธ (403)
    if (!user || !user.role || !requiredRoles.includes(user.role)) {
      throw new ForbiddenException(
        `Access denied. Requires one of the following roles: [${requiredRoles.join(', ')}]`,
      );
    }

    return true;
  }
}
