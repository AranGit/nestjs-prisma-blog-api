import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Role } from '@prisma/client';
import { RolesGuard } from './roles.guard.js';

/**
 * ==============================================================================
 * Unit Tests: RolesGuard (RBAC Authorization Guard)
 * ==============================================================================
 * ทดสอบการตรวจสอบสิทธิ์ของผู้ใช้เทียบกับ Required Roles
 * ==============================================================================
 */
describe('RolesGuard', () => {
  let guard: RolesGuard;
  let reflector: Reflector;

  beforeEach(() => {
    reflector = new Reflector();
    guard = new RolesGuard(reflector);
  });

  function createMockExecutionContext(user: any): ExecutionContext {
    return {
      getHandler: vi.fn(),
      getClass: vi.fn(),
      switchToHttp: vi.fn().mockReturnValue({
        getRequest: vi.fn().mockReturnValue({ user }),
      }),
    } as unknown as ExecutionContext;
  }

  it('ควรอนุญาตให้ผ่านเมื่อ Endpoint ไม่ได้ระบุ @Roles(...) (Public/Any role)', () => {
    vi.spyOn(reflector, 'getAllAndOverride').mockReturnValue(undefined);

    const context = createMockExecutionContext({ role: Role.AUTHOR });

    expect(guard.canActivate(context)).toBe(true);
  });

  it('ควรอนุญาตให้ผ่านเมื่อ Role ของผู้ใช้ตรงกับที่ต้องการ', () => {
    vi.spyOn(reflector, 'getAllAndOverride').mockReturnValue([Role.ADMIN]);

    const context = createMockExecutionContext({ role: Role.ADMIN });

    expect(guard.canActivate(context)).toBe(true);
  });

  it('ควรโยน ForbiddenException (403) เมื่อ Role ไม่ตรงกับสิทธิ์ที่ต้องการ', () => {
    vi.spyOn(reflector, 'getAllAndOverride').mockReturnValue([Role.ADMIN]);

    const context = createMockExecutionContext({ role: Role.AUTHOR });

    expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
  });
});
