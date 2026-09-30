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
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';

/**
 * ==============================================================================
 * UsersController (HTTP Presentation Layer / ชั้นรับส่งคำขอ HTTP)
 * ==============================================================================
 * ทำหน้าที่รับ HTTP Request จาก Client, นำพาข้อมูลเข้าสู่การ Validate และส่งต่อให้ Service
 *
 * RBAC Authorization Rules:
 * - `POST /users`: เฉพาะ ADMIN (Admin User Provisioning) ส่วนคนทั่วไปใช้ `/auth/register`
 * - `GET /users`: เฉพาะ ADMIN เท่านั้น เพื่อป้องกันการกวาดข้อมูลผู้ใช้ (Scraping)
 * - `GET /users/:id`: ต้อง Login ถึงจะดูข้อมูลได้
 * - `PATCH /users/:id`: ต้อง Login และแก้ได้เฉพาะบัญชีตัวเอง ยกเว้น ADMIN แก้ได้ทุกคน
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
   * ดึงรายการผู้ใช้ทั้งหมดในระบบ (เฉพาะ ADMIN เท่านั้น)
   */
  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get all users (Admin only)', description: 'Retrieves all registered users. Requires ADMIN role.' })
  @ApiResponse({ status: 200, description: 'List of all users.' })
  @ApiResponse({ status: 401, description: 'Unauthorized - Missing or invalid token.' })
  @ApiResponse({ status: 403, description: 'Forbidden - Requires ADMIN role.' })
  findAll() {
    return this.usersService.findAll();
  }

  /**
   * [GET] /api/v1/users/:id
   * ดึงข้อมูลผู้ใช้รายบุคคลด้วย ID พร้อมบทความที่เคยเขียน (ต้อง Login)
   */
  @Get(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get a user by ID (Authenticated)', description: 'Retrieves a single user along with their authored posts.' })
  @ApiParam({ name: 'id', type: Number, description: 'Unique user identifier' })
  @ApiResponse({ status: 200, description: 'User found.' })
  @ApiResponse({ status: 401, description: 'Unauthorized - Missing or invalid token.' })
  @ApiResponse({ status: 404, description: 'User with given ID not found.' })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.usersService.findOne(id);
  }

  /**
   * [PATCH] /api/v1/users/:id
   * แก้ไขข้อมูลผู้ใช้บางส่วน (ผู้ใช้แก้ได้เฉพาะบัญชีตัวเอง หรือเป็น ADMIN)
   */
  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update a user (Self or Admin)', description: 'Partially updates existing user information. Users can only update their own profile unless ADMIN.' })
  @ApiParam({ name: 'id', type: Number, description: 'User ID to update' })
  @ApiResponse({ status: 200, description: 'User successfully updated.' })
  @ApiResponse({ status: 401, description: 'Unauthorized - Missing or invalid token.' })
  @ApiResponse({ status: 403, description: 'Forbidden - You can only update your own profile.' })
  @ApiResponse({ status: 404, description: 'User not found.' })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateUserDto: UpdateUserDto,
    @CurrentUser() currentUser: { id: number; role: Role },
  ) {
    return this.usersService.update(id, updateUserDto, currentUser);
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
