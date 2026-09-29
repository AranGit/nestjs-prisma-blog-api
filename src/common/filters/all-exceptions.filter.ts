import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpStatus,
} from '@nestjs/common';
import { Request, Response } from 'express';

/**
 * ==============================================================================
 * AllExceptionsFilter (Catch-All Exception Filter)
 * ==============================================================================
 * ตาข่ายดักจับข้อผิดพลาดชั้นสุดท้าย (Last line of defense)
 * ดักจับข้อผิดพลาดทุกชนิดที่ไม่ได้สืบทอดมาจาก HttpException (เช่น Database Crash, Type Error, Unhandled Promise)
 *
 * Backend Concept:
 * 1. `@Catch()` (ไม่มีพารามิเตอร์): ดักจับทุก Exception ที่หลุดรอดมาในระบบ
 * 2. Security & Information Hiding:
 *    - ใน Production เราไม่ควรส่ง Raw Error Stacktrace ให้ผู้ใช้เห็น เพราะอาจรั่วไหลข้อมูลสำคัญ (Database credentials, file paths)
 *    - ควรตอบกลับเป็น Status 500 Internal Server Error พร้อมข้อความที่ปลอดภัย
 * 3. Logging: บันทึก error ลงใน console หรือ centralized logging system (เช่น Winston, Datadog) เพื่อให้ทีม Dev เข้ามา Debug
 * ==============================================================================
 */
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    // กำหนด status เป็น 500 สำหรับ unhandled exceptions
    const status = HttpStatus.INTERNAL_SERVER_ERROR;
    const message = exception instanceof Error ? exception.message : 'Internal server error';

    // บันทึก Log ฝั่ง Server สำหรับการตรวจสอบและแก้ไขปัญหา
    console.error('[Unhandled Exception]:', exception);

    // ส่งโครงสร้าง error แบบมาตรฐานเดียวกันกลับไปหา Client
    response.status(status).json({
      statusCode: status,
      timestamp: new Date().toISOString(),
      path: request.url,
      message,
    });
  }
}
