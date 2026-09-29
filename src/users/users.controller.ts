import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  ParseIntPipe,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiBearerAuth } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { UsersService } from './users.service.js';
import { CreateUserDto } from './dto/create-user.dto.js';
import { UpdateUserDto } from './dto/update-user.dto.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { RolesGuard } from '../auth/guards/roles.guard.js';
import { Roles } from '../auth/decorators/roles.decorator.js';

/**
 * ==============================================================================
 * UsersController (HTTP Presentation Layer / ชั้นรับส่งคำขอ HTTP)
 * ==============================================================================
 * ทำหน้าที่รับ HTTP Request จาก Client, นำพาข้อมูลเข้าสู่การ Validate และส่งต่อให้ Service
 *
 * RBAC Authorization Rules:
 * - `POST /users`: เฉพาะ ADMIN (Admin User Provisioning) ส่วนคนทั่วไปใช้ `/auth/register`
 * - `GET /users`, `GET /users/:id`: ดูข้อมูลผู้ใช้
 * - `PATCH /users/:id`: แก้ไขข้อมูลผู้ใช้
 * - `DELETE /users/:id`: เฉพาะ ADMIN เท่านั้น
 * ==============================================================================
 */
@ApiTags('Users')
@Controller({ path: 'users', version: '1' })
export class UsersController {
  // Inject UsersService ผ่าน Constructor
  constructor(private readonly usersService: UsersService) {}

  /**
   * [POST] /api/v1/users
   * สร้างผู้ใช้งานใหม่ (เฉพาะ ADMIN เท่านั้น เช่น การสร้าง staff, author หรือ admin อื่นๆ)
   * สำหรับผู้ใช้ทั่วไปที่ต้องการสมัครสมาชิกเอง ให้ใช้ POST /api/v1/auth/register
   */
  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Create a new user (Admin only)',
    description: 'Admin user provisioning endpoint. Allows setting roles (ADMIN/AUTHOR). For self-registration, use /api/v1/auth/register.',
  })
  @ApiResponse({ status: 201, description: 'User successfully created.' })
  @ApiResponse({ status: 400, description: 'Validation failed.' })
  @ApiResponse({ status: 401, description: 'Unauthorized - Missing or invalid token.' })
  @ApiResponse({ status: 403, description: 'Forbidden - Requires ADMIN role.' })
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
   * ลบผู้ใช้งานออกจากระบบ (เฉพาะ ADMIN เท่านั้น)
   */
  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete a user (Admin only)', description: 'Deletes a user account and cascades delete to their posts. Requires ADMIN role.' })
  @ApiParam({ name: 'id', type: Number, description: 'User ID to delete' })
  @ApiResponse({ status: 200, description: 'User successfully deleted.' })
  @ApiResponse({ status: 401, description: 'Unauthorized - Missing or invalid token.' })
  @ApiResponse({ status: 403, description: 'Forbidden - Requires ADMIN role.' })
  @ApiResponse({ status: 404, description: 'User not found.' })
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.usersService.remove(id);
  }
}
