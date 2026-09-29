import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Request, Response } from 'express';

/**
 * ==============================================================================
 * HttpExceptionFilter (Custom Global Exception Filter)
 * ==============================================================================
 * ดักจับเฉพาะข้อผิดพลาดที่เป็นชนิด `HttpException` (เช่น 400 Bad Request, 404 Not Found, 409 Conflict)
 * เพื่อแปลงรูปแบบ Error Response ให้เป็นมาตรฐานเดียวกันทั้งระบบ (Standardized Error Schema)
 *
 * Backend Concept:
 * 1. `@Catch(HttpException)`: ตัวตกแต่งที่บอก NestJS ว่า Filter นี้สนใจเฉพาะ Error ที่เป็น HttpException
 * 2. `ArgumentsHost`: ออบเจ็กต์สากลของ NestJS ที่เก็บ Execution Context ไม่ว่าจะเป็น HTTP, WebSocket หรือ Microservice
 *    - `host.switchToHttp()`: เปลี่ยน context ให้เข้าถึง request และ response ของ HTTP ได้
 * 3. Consistent Error Contract: เป็นมาตรฐาน API ที่ดี ทำให้ Frontend / Client คาดเดาโครงสร้าง error ได้ง่าย
 *    โดยคืนค่ารูปแบบ:
 *    {
 *      "statusCode": 400,
 *      "timestamp": "2026-09-29T12:00:00.000Z",
 *      "path": "/api/v1/posts",
 *      "message": "Validation failed"
 *    }
 * ==============================================================================
 */
@Catch(HttpException)
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: HttpException, host: ArgumentsHost) {
    // 1. ดึง HTTP Context จาก ArgumentsHost
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    // 2. ดึง HTTP Status Code จาก Exception (เช่น 400, 401, 403, 404)
    const status = exception.getStatus();

    // 3. ดึงเนื้อหา error response ดั้งเดิมที่ส่งมาจาก throw new HttpException(...) หรือ ValidationPipe
    const exceptionResponse = exception.getResponse();

    // 4. สกัดข้อความ error (กรณี ValidationPipe มักส่งเป็น object ที่มี array ของ validation messages)
    let message: string | string[];
    if (typeof exceptionResponse === 'string') {
      message = exceptionResponse;
    } else if (typeof exceptionResponse === 'object' && exceptionResponse !== null) {
      // ดึง property .message ถ้ามี หากไม่มีให้ใช้ exception.message พื้นฐาน
      message = (exceptionResponse as any).message || exception.message;
    } else {
      message = exception.message;
    }

    // 5. ส่ง Response JSON กลับไปยัง Client ด้วยโครงสร้างที่กำหนด
    response.status(status).json({
      statusCode: status,
      timestamp: new Date().toISOString(),
      path: request.url,
      message,
    });
  }
}
