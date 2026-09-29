import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { User } from '@prisma/client';

/**
 * ==============================================================================
 * 👤 @CurrentUser(data?: keyof User) Decorator
 * ==============================================================================
 * Parameter Decorator สำหรับดึงข้อมูล User ปัจจุบันที่ผ่านการยืนยันตัวตน (JWT) แล้ว
 *
 * 💡 ตัวอย่างการใช้งานใน Controller:
 * 1. ดึง User ทั้งหมด:
 *    `@Get('profile')`
 *    `getProfile(@CurrentUser() user: User) { return user; }`
 *
 * 2. ดึงเฉพาะฟิลด์ (เช่น user.id):
 *    `@Post()`
 *    `createPost(@CurrentUser('id') userId: number) { ... }`
 * ==============================================================================
 */
export const CurrentUser = createParamDecorator(
  (data: keyof User | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      return null;
    }

    return data ? user[data] : user;
  },
);
