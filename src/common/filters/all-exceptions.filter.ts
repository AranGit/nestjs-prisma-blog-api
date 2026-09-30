import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpStatus,
  Logger,
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
 *    - ใน Production เราไม่ควรส่ง Raw Error Stacktrace หรือ Database Exception Message ให้ผู้ใช้เห็น
 *      เพราะอาจรั่วไหลข้อมูลสำคัญ (Database credentials, schema, file paths)
 *    - ควรตอบกลับเป็น Status 500 Internal Server Error พร้อมข้อความที่ปลอดภัย
 * 3. Logging: บันทึก error ลงใน Logger ของ NestJS สำหรับการ debug
 * ==============================================================================
 */
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    // ป้องกันกรณี headers ถูกส่งไปแล้ว
    if (response.headersSent) {
      return;
    }

    // กำหนด status เป็น 500 สำหรับ unhandled exceptions
    const status = HttpStatus.INTERNAL_SERVER_ERROR;

    // บันทึก Log ฝั่ง Server สำหรับการตรวจสอบและแก้ไขปัญหา
    this.logger.error(
      `Unhandled exception on ${request.method} ${request.url}`,
      exception instanceof Error ? exception.stack : String(exception),
    );

    // ป้องกันการรั่วไหลของ Internal Error Details ใน Production
    const isProduction = process.env.NODE_ENV === 'production';
    const message = isProduction
      ? 'Internal server error'
      : exception instanceof Error
        ? exception.message
        : 'Internal server error';

    // ส่งโครงสร้าง error แบบมาตรฐานเดียวกันกลับไปหา Client
    response.status(status).json({
      statusCode: status,
      timestamp: new Date().toISOString(),
      path: request.url,
      message,
    });
  }
}
