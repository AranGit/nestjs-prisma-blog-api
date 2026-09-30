import { Injectable, NotFoundException, ConflictException, ForbiddenException } from '@nestjs/common';
import bcrypt from 'bcrypt';
import { Role } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service.js';
import { CreateUserDto } from './dto/create-user.dto.js';
import { UpdateUserDto } from './dto/update-user.dto.js';

/**
 * ==============================================================================
 * UsersService (Business Logic Layer / ชั้นตรรกะทางธุรกิจ)
 * ==============================================================================
 * ทำหน้าที่ประมวลผลข้อมูล ตรวจสอบเงื่อนไขทางธุรกิจ และเรียกใช้งาน Prisma ORM
 *
 * Backend Architecture Concept:
 * 1. Separation of Concerns (SoC):
 *    - Controller: รับ Request, Validate, และส่ง Response กลับ
 *    - Service: เขียน logic ทางธุรกิจจริงๆ เพื่อให้ reuse ใน CLI หรือ Queue ได้ง่าย
 * 2. Security (Data Masking & Hashing):
 *    - รหัสผ่านจะถูกแฮชด้วย `bcrypt` ก่อนบันทึกลงฐานข้อมูลเสมอ
 *    - ห้ามส่ง field `password` กลับไปให้ Client เป็นอันขาด!
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
   * สร้างผู้ใช้ใหม่ (Create User)
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

    // แฮชรหัสผ่านก่อนบันทึกลง Database
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
   * ดึงรายชื่อผู้ใช้ทั้งหมด (Get All Users - เฉพาะที่ยังไม่ถูก Soft Delete)
   */
  async findAll() {
    return this.prisma.user.findMany({
      where: { deletedAt: null },
      take: 100, // Safety limit: ป้องกัน memory exhaustion
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
   * ค้นหาผู้ใช้รายคนตาม ID (Get User by ID)
   * รวมรายการบทความ (posts) ที่ยังไม่ถูกลบซึ่งผู้ใช้นี้เป็นผู้เขียนกลับไปด้วย
   */
  async findOne(id: number) {
    const user = await this.prisma.user.findFirst({
      where: { id, deletedAt: null },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        createdAt: true,
        updatedAt: true,
        // Relation Query: ดึงเฉพาะบทความที่ยังไม่ถูกลบ
        posts: {
          where: { deletedAt: null },
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
   * แก้ไขข้อมูลผู้ใช้ (Update User)
   * ตรวจสอบว่าผู้ใช้มีตัวตนอยู่จริงและยังไม่ถูกลบก่อนทำการอัปเดต
   * พร้อมทั้งตรวจสอบสิทธิ์ความเป็นเจ้าของบัญชี (Ownership Check)
   */
  async update(
    id: number,
    updateUserDto: UpdateUserDto,
    currentUser: { id: number; role: Role },
  ) {
    // 1. ตรวจสอบสิทธิ์: ผู้ใช้แก้ไขได้เฉพาะโปรไฟล์ของตนเอง เว้นแต่เป็น ADMIN
    if (currentUser.role !== Role.ADMIN && currentUser.id !== id) {
      throw new ForbiddenException('You can only update your own profile');
    }

    // 2. ตรวจสอบก่อนว่า User ID นี้มีอยู่จริงไหม
    await this.findOne(id);

    // 3. หากมีการขอเปลี่ยน email ให้เช็คว่าซ้ำกับผู้อื่นหรือไม่
    if (updateUserDto.email) {
      const emailConflict = await this.prisma.user.findFirst({
        where: { email: updateUserDto.email, id: { not: id } },
      });
      if (emailConflict) {
        throw new ConflictException('User with this email already exists');
      }
    }

    const dataToUpdate: Record<string, unknown> = { ...updateUserDto };
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
   * ลบผู้ใช้ (Soft Delete User)
   * ดำเนินการแบบ Application-Level Soft Cascade ภายใต้ Prisma Transaction:
   * 1. มาร์ก deletedAt ของ User
   * 2. Soft delete บทความทั้งหมดของผู้ใช้คนนี้พร้อมกัน
   */
  async remove(id: number) {
    await this.findOne(id);

    const now = new Date();
    const [deletedUser] = await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id },
        data: { deletedAt: now },
        select: {
          id: true,
          email: true,
          name: true,
        },
      }),
      this.prisma.post.updateMany({
        where: { authorId: id, deletedAt: null },
        data: { deletedAt: now },
      }),
    ]);

    return deletedUser;
  }
}
