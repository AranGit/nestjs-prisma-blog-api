import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service.js';
import { CreateUserDto } from './dto/create-user.dto.js';
import { UpdateUserDto } from './dto/update-user.dto.js';

/**
 * ==============================================================================
 * 🧠 UsersService (Business Logic Layer / ชั้นตรรกะทางธุรกิจ)
 * ==============================================================================
 * ทำหน้าที่ประมวลผลข้อมูล ตรวจสอบเงื่อนไขทางธุรกิจ และเรียกใช้งาน Prisma ORM
 *
 * 💡 Backend Architecture Concept:
 * 1. Separation of Concerns (SoC):
 *    - Controller: รับ Request, Validate, และส่ง Response กลับ
 *    - Service: เขียน logic ทางธุรกิจจริงๆ เพื่อให้ reuse ใน CLI หรือ Queue ได้ง่าย
 * 2. Security (Data Masking & Hashing):
 *    - รหัสผ่านจะถูกแฮชด้วย `bcrypt` ก่อนบันทึกลงฐานข้อมูลเสมอ
 *    - ⚠️ ห้ามส่ง field `password` กลับไปให้ Client เป็นอันขาด!
 *    - เราใช้ `select: { id, email, name, role, ... }` เพื่อเลือกเฉพาะฟิลด์ที่ปลอดภัยส่งกลับ
 * 3. Exception Handling:
 *    - `ConflictException` (409): ใช้เมื่อพบข้อมูลซ้ำซ้อนที่ไม่สามารถสร้างได้ (เช่น Email ซ้ำ)
 *    - `NotFoundException` (404): ใช้เมื่อค้นหา Resource ด้วย ID แล้วไม่พบในระบบ
 * ==============================================================================
 */
@Injectable()
export class UsersService {
  private readonly SALT_ROUNDS = 10;

  // Dependency Injection: NestJS จะสร้างและส่ง PrismaService เข้ามาให้ใน constructor โดยอัตโนมัติ
  constructor(private readonly prisma: PrismaService) {}

  /**
   * ➕ สร้างผู้ใช้ใหม่ (Create User)
   * 1. ตรวจสอบว่ามีอีเมลนี้ในระบบแล้วหรือไม่
   * 2. แฮชรหัสผ่านด้วย bcrypt
   * 3. บันทึกข้อมูลลงฐานข้อมูลโดยตัด password ออกจากการตอบกลับ
   */
  async create(createUserDto: CreateUserDto) {
    const existingUser = await this.prisma.user.findUnique({
      where: { email: createUserDto.email },
    });

    if (existingUser) {
      throw new ConflictException('User with this email already exists');
    }

    // 🔒 แฮชรหัสผ่านก่อนบันทึกลง Database
    const hashedPassword = await bcrypt.hash(createUserDto.password, this.SALT_ROUNDS);

    return this.prisma.user.create({
      data: {
        ...createUserDto,
        password: hashedPassword,
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  }

  /**
   * 📋 ดึงรายชื่อผู้ใช้ทั้งหมด (Get All Users)
   */
  async findAll() {
    return this.prisma.user.findMany({
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  }

  /**
   * 🔍 ค้นหาผู้ใช้รายคนตาม ID (Get User by ID)
   * รวมรายการบทความ (posts) ที่ผู้ใช้นี้เป็นผู้เขียนกลับไปด้วย
   */
  async findOne(id: number) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        createdAt: true,
        updatedAt: true,
        // Relation Query: ดึงบทความของผู้ใช้นี้มาด้วยพร้อมกัน
        posts: {
          select: {
            id: true,
            title: true,
            isPublished: true,
            createdAt: true,
          },
        },
      },
    });

    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }

    return user;
  }

  /**
   * ✏️ แก้ไขข้อมูลผู้ใช้ (Update User)
   * ตรวจสอบว่าผู้ใช้มีตัวตนอยู่จริงก่อนทำการอัปเดต
   */
  async update(id: number, updateUserDto: UpdateUserDto) {
    // ตรวจสอบก่อนว่า User ID นี้มีอยู่จริงไหม (ถ้าไม่มีจะ throw NotFoundException 404 ทันที)
    await this.findOne(id);

    const dataToUpdate: any = { ...updateUserDto };
    if (updateUserDto.password) {
      dataToUpdate.password = await bcrypt.hash(updateUserDto.password, this.SALT_ROUNDS);
    }

    return this.prisma.user.update({
      where: { id },
      data: dataToUpdate,
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  }

  /**
   * 🗑️ ลบผู้ใช้ (Delete User)
   * เนื่องจาก Prisma Schema ตั้งค่า onDelete: Cascade เอาไว้
   * หากลบ User นี้ โพสต์ทั้งหมดของเขาจะถูกลบไปด้วยโดยอัตโนมัติในฐานข้อมูล
   */
  async remove(id: number) {
    await this.findOne(id);

    return this.prisma.user.delete({
      where: { id },
      select: {
        id: true,
        email: true,
        name: true,
      },
    });
  }
}
