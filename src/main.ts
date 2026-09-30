import { NestFactory } from '@nestjs/core';
import { Logger, ValidationPipe, VersioningType } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { apiReference } from '@scalar/nestjs-api-reference';
import { AppModule } from './app.module.js';
import { HttpExceptionFilter } from './common/filters/http-exception.filter.js';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter.js';

/**
 * ==============================================================================
 * bootstrap() - Application Entry Point (จุดเริ่มต้นของระบบ)
 * ==============================================================================
 * ฟังก์ชันหลักที่ใช้สร้าง NestJS Instance และตั้งค่า Middleware, Pipes, Filters, Swagger
 *
 * Key Backend Concepts Demonstrated Here:
 * 1. CORS: อนุญาตให้ Frontend (React, Vue, Next.js) ที่รันต่าง origin สามารถเรียก API ได้
 * 2. Global Prefix: ตั้งค่า Path เริ่มต้นของทุก Endpoint เช่น `/api/...`
 * 3. API Versioning: รองรับการพัฒนา API หลายเวอร์ชันพร้อมกัน (เช่น `/api/v1/...` และ `/api/v2/...`)
 * 4. ValidationPipe: กลไกตรวจสอบข้อมูล Request Body อัตโนมัติด้วย Class-Validator
 * 5. Global Exception Filters: ระบบดักจับและปรับแต่ง Error Response ให้เป็นมาตรฐานเดียวกัน
 * 6. Swagger (OpenAPI): ระบบเอกสาร API อัตโนมัติพร้อมหน้าต่าง Interactive UI ให้ทดสอบยิง API
 * ==============================================================================
 */
async function bootstrap() {
  // 1. สร้าง Nest Application Instance จาก Root AppModule
  const app = await NestFactory.create(AppModule);

  // 2. เปิดใช้งาน CORS (Cross-Origin Resource Sharing)
  // ช่วยให้ Web Browser ยอมรับ Request ข้ามโดเมนได้ (เช่น Frontend บน localhost:5173 ยิงมาที่ Backend บน localhost:3000)
  app.enableCors();

  // 3. กำหนด Global Route Prefix เป็น 'api'
  // ผลลัพธ์: ทุก endpoint จะขึ้นต้นด้วย /api เช่น /api/...
  app.setGlobalPrefix('api');

  // 4. เปิดใช้งาน API Versioning แบบ URI Versioning
  // ผลลัพธ์: เส้นทางของ API จะมี version กำกับ เช่น /api/v1/... หรือ /api/v2/...
  // defaultVersion: '1' หมายถึง Controller ใดที่ไม่ระบุ version จะถือว่าเป็น v1 โดยอัตโนมัติ
  app.enableVersioning({
    type: VersioningType.URI,
    defaultVersion: '1',
  });

  // 5. เปิดใช้งาน Global Validation Pipe
  // ใช้ class-validator และ class-transformer เพื่อตรวจสอบข้อมูลนำเข้าใน DTO ทั้งหมด
  app.useGlobalPipes(
    new ValidationPipe({
      // whitelist: ตัด field ที่ไม่ได้ประกาศไว้ใน DTO ทิ้งอัตโนมัติ (ป้องกัน Mass Assignment Vulnerability)
      whitelist: true,

      // forbidNonWhitelisted: ถ้ามี field แปลกปลอมที่ไม่ได้รับอนุญาตส่งเข้ามา ให้โยน 400 Bad Request ทันที
      forbidNonWhitelisted: true,

      // transform: แปลง payload ที่เข้ามาให้เป็น instance ของ DTO Class ตาม Type จริง (เช่น แปลง String เป็น Number)
      transform: true,

      // transformOptions: อนุญาตให้แปลง primitive types อัตโนมัติ (เช่น Query param string "1" แปลงเป็น number 1)
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  // 6. ลงทะเบียน Global Exception Filters
  // ลำดับมีความสำคัญ: AllExceptionsFilter (จับ Error ทั่วไป 500) ต้องมาก่อน HttpExceptionFilter
  // เพื่อให้ HttpExceptionFilter จัดการ HTTP Status เฉพาะทาง (400, 404, 409) ได้อย่างแม่นยำ
  app.useGlobalFilters(new AllExceptionsFilter(), new HttpExceptionFilter());

  // 7. การตั้งค่า Swagger / OpenAPI Documentation
  // DocumentBuilder ใช้สร้าง metadata เช่น Title, Description, Tags และ Version ของ API
  const config = new DocumentBuilder()
    .setTitle('Blog CMS API')
    .setDescription(
      'A RESTful API for a Blog / CMS built with NestJS, Prisma, and PostgreSQL.\n\n' +
      'Supports URI Versioning:\n' +
      '- **v1**: Standard CRUD endpoints (/api/v1/...)\n' +
      '- **v2**: Enhanced endpoints with pagination, search, blog stats, and reading metrics (/api/v2/...)',
    )
    .setVersion('2.0')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        name: 'JWT',
        description: 'Enter your JWT token (obtained from /api/v1/auth/login or register)',
        in: 'header',
      },
      'bearer', // default name matching @ApiBearerAuth()
    )
    .addTag('Authentication', 'User authentication & JWT token generation (v1)')
    .addTag('Users', 'User management endpoints (v1)')
    .addTag('Categories', 'Category management endpoints (v1)')
    .addTag('Posts (v1)', 'Post management endpoints (v1)')
    .addTag('Posts (v2)', 'Enhanced post endpoints with pagination, search, and reading metrics (v2)')
    .build();

  // สร้าง OpenAPI Specification Document จากโค้ดและ Decorator ทั้งหมด
  const document = SwaggerModule.createDocument(app, config);

  // ให้บริการ Swagger UI ที่พาธ `/api/docs`
  SwaggerModule.setup('api/docs', app, document);

  // 8. ให้บริการ Modern Interactive API Documentation ด้วย Scalar ที่พาธ `/api/reference`
  app.use(
    '/api/reference',
    apiReference({
      spec: {
        content: document,
      },
    }),
  );

  // 9. เปิดใช้งาน Graceful Shutdown Hooks สำหรับ PrismaService และ RedisService
  app.enableShutdownHooks();

  // 10. เริ่มต้นรับฟัง HTTP Request บน Port ที่กำหนด (Default คือ 3000)
  const port = process.env.PORT ?? 3000;
  await app.listen(port);

  const logger = new Logger('Bootstrap');
  logger.log(`Application is running on: http://localhost:${port}/api`);
  logger.log(`Swagger documentation: http://localhost:${port}/api/docs`);
  logger.log(`Scalar API reference: http://localhost:${port}/api/reference`);
}

// เริ่มต้นรันฟังก์ชัน bootstrap
bootstrap();
