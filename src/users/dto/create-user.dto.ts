import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsString, MinLength, IsEnum, IsOptional } from 'class-validator';
import { Role } from '@prisma/client';

/**
 * ==============================================================================
 * 📥 CreateUserDto (Data Transfer Object สำหรับสร้างผู้ใช้ใหม่)
 * ==============================================================================
 * DTO คือ Object ที่ใช้กำหนดโครงสร้างและข้อกำหนดของข้อมูลที่ส่งเข้ามาทาง Request Body
 *
 * 💡 Backend Concept:
 * 1. Data Contract: เป็นสัญญาตกลงระหว่าง Frontend และ Backend ว่า payload ต้องมีฟิลด์อะไรบ้าง
 * 2. Validation: ใช้ Decorator จาก `class-validator` เพื่อตรวจสอบความถูกต้องก่อนโค้ด Service จะทำงาน
 * 3. Swagger Integration: `@ApiProperty()` นำ metadata ไปสร้างเอกสารบน Swagger UI ให้อัตโนมัติ
 * ==============================================================================
 */
export class CreateUserDto {
  // @ApiProperty: แสดงคำอธิบายและตัวอย่างใน Swagger
  // @IsEmail: ตรวจสอบรูปแบบ Email (เช่น ต้องมี @ และ domain)
  // @IsNotEmpty: ห้ามส่งค่าว่างหรือ string ว่าง ("")
  @ApiProperty({ example: 'john@example.com', description: 'User email address (must be valid email format)' })
  @IsEmail()
  @IsNotEmpty()
  email: string;

  // @MinLength(6): บังคับความยาวรหัสผ่านอย่างน้อย 6 ตัวอักษรเพื่อความปลอดภัยขั้นพื้นฐาน
  @ApiProperty({ example: 'strongPassword123', description: 'User password (minimum 6 characters)', minLength: 6 })
  @IsString()
  @IsNotEmpty()
  @MinLength(6)
  password: string;

  // @IsString: ตรวจสอบว่าเป็นชนิดตัวอักษร (String)
  @ApiProperty({ example: 'John Doe', description: 'User display name' })
  @IsString()
  @IsNotEmpty()
  name: string;

  // @IsEnum: อนุญาตให้ระบุ Role (ADMIN หรือ AUTHOR) หากไม่ระบุจะเป็น AUTHOR ตาม Default ใน Schema
  @ApiProperty({
    example: 'AUTHOR',
    enum: Role,
    description: 'User access role (ADMIN or AUTHOR). Defaults to AUTHOR.',
    required: false,
    default: Role.AUTHOR,
  })
  @IsEnum(Role)
  @IsOptional()
  role?: Role;
}
