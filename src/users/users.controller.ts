import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  ParseIntPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam } from '@nestjs/swagger';
import { UsersService } from './users.service.js';
import { CreateUserDto } from './dto/create-user.dto.js';
import { UpdateUserDto } from './dto/update-user.dto.js';

/**
 * ==============================================================================
 * 🌐 UsersController (HTTP Presentation Layer / ชั้นรับส่งคำขอ HTTP)
 * ==============================================================================
 * ทำหน้าที่รับ HTTP Request จาก Client, นำพาข้อมูลเข้าสู่การ Validate และส่งต่อให้ Service
 *
 * 💡 Backend Concept:
 * 1. `@Controller({ path: 'users', version: '1' })`:
 *    - เมื่อรวมกับ Global Prefix 'api' จะได้ URL Base: `/api/v1/users`
 * 2. `@ApiTags('Users')`: จัดหมวดหมู่ API ในหน้า Swagger UI ให้อยู่ในกลุ่ม 'Users'
 * 3. Pipes (`ParseIntPipe`):
 *    - URL parameter เช่น `:id` ใน HTTP จะส่งมาเป็น String เสมอ (เช่น "/users/5")
 *    - `ParseIntPipe` จะทำการแปลง "5" ให้เป็นตัวเลข number 5 โดยอัตโนมัติ
 *    - หากผู้ใช้ส่งค่าที่ไม่ใช่ตัวเลข เช่น "/users/abc" ระบบจะตอบกลับ 400 Bad Request ทันทีโดยไม่ต้องเขียน if-else
 * ==============================================================================
 */
@ApiTags('Users')
@Controller({ path: 'users', version: '1' })
export class UsersController {
  // Inject UsersService ผ่าน Constructor
  constructor(private readonly usersService: UsersService) {}

  /**
   * [POST] /api/v1/users
   * สร้างผู้ใช้งานใหม่
   * @Body(): ดึงข้อมูลจาก JSON Request Body และแปลงเป็น CreateUserDto ผ่าน ValidationPipe
   */
  @Post()
  @ApiOperation({ summary: 'Create a new user', description: 'Creates a user account and returns user details excluding password.' })
  @ApiResponse({ status: 201, description: 'User successfully created.' })
  @ApiResponse({ status: 400, description: 'Validation failed.' })
  @ApiResponse({ status: 409, description: 'User with this email already exists.' })
  create(@Body() createUserDto: CreateUserDto) {
    return this.usersService.create(createUserDto);
  }

  /**
   * [GET] /api/v1/users
   * ดึงรายการผู้ใช้ทั้งหมดในระบบ
   */
  @Get()
  @ApiOperation({ summary: 'Get all users', description: 'Retrieves all registered users.' })
  @ApiResponse({ status: 200, description: 'List of all users.' })
  findAll() {
    return this.usersService.findAll();
  }

  /**
   * [GET] /api/v1/users/:id
   * ดึงข้อมูลผู้ใช้รายบุคคลด้วย ID พร้อมบทความที่เคยเขียน
   */
  @Get(':id')
  @ApiOperation({ summary: 'Get a user by ID', description: 'Retrieves a single user along with their authored posts.' })
  @ApiParam({ name: 'id', type: Number, description: 'Unique user identifier' })
  @ApiResponse({ status: 200, description: 'User found.' })
  @ApiResponse({ status: 404, description: 'User with given ID not found.' })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.usersService.findOne(id);
  }

  /**
   * [PATCH] /api/v1/users/:id
   * แก้ไขข้อมูลผู้ใช้บางส่วน
   */
  @Patch(':id')
  @ApiOperation({ summary: 'Update a user', description: 'Partially updates existing user information.' })
  @ApiParam({ name: 'id', type: Number, description: 'User ID to update' })
  @ApiResponse({ status: 200, description: 'User successfully updated.' })
  @ApiResponse({ status: 404, description: 'User not found.' })
  update(@Param('id', ParseIntPipe) id: number, @Body() updateUserDto: UpdateUserDto) {
    return this.usersService.update(id, updateUserDto);
  }

  /**
   * [DELETE] /api/v1/users/:id
   * ลบผู้ใช้งานออกจากระบบ
   */
  @Delete(':id')
  @ApiOperation({ summary: 'Delete a user', description: 'Deletes a user account and cascades delete to their posts.' })
  @ApiParam({ name: 'id', type: Number, description: 'User ID to delete' })
  @ApiResponse({ status: 200, description: 'User successfully deleted.' })
  @ApiResponse({ status: 404, description: 'User not found.' })
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.usersService.remove(id);
  }
}
