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
import { CategoriesService } from './categories.service.js';
import { CreateCategoryDto } from './dto/create-category.dto.js';
import { UpdateCategoryDto } from './dto/update-category.dto.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { RolesGuard } from '../auth/guards/roles.guard.js';
import { Roles } from '../auth/decorators/roles.decorator.js';

/**
 * ==============================================================================
 * CategoriesController (HTTP Controller สำหรับจัดการหมวดหมู่)
 * ==============================================================================
 * เส้นทาง Base URL: `/api/v1/categories`
 *
 * RBAC Authorization Rules:
 * - `GET` (ดูหมวดหมู่): เปิดเป็น Public ให้ทุกคนเข้าถึงได้
 * - `POST`, `PATCH`, `DELETE`: ต้องล็อกอิน (JWT) และจำกัดสิทธิ์เฉพาะ `ADMIN` เท่านั้น
 * ==============================================================================
 */
@ApiTags('Categories')
@Controller({ path: 'categories', version: '1' })
export class CategoriesController {
  constructor(private readonly categoriesService: CategoriesService) {}

  /**
   * [POST] /api/v1/categories
   * สร้างหมวดหมู่ใหม่ (เฉพาะ ADMIN)
   */
  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a new category (Admin only)', description: 'Requires ADMIN role.' })
  @ApiResponse({ status: 201, description: 'Category successfully created.' })
  @ApiResponse({ status: 401, description: 'Unauthorized - Missing or invalid token.' })
  @ApiResponse({ status: 403, description: 'Forbidden - Requires ADMIN role.' })
  @ApiResponse({ status: 409, description: 'Category name already exists.' })
  create(@Body() createCategoryDto: CreateCategoryDto) {
    return this.categoriesService.create(createCategoryDto);
  }

  /**
   * [GET] /api/v1/categories
   * ดึงรายการหมวดหมู่ทั้งหมด พร้อมจำนวนบทความในแต่ละหมวดหมู่ (Public)
   */
  @Get()
  @ApiOperation({ summary: 'Get all categories (Public)', description: 'Returns a list of all categories sorted alphabetically with post count.' })
  @ApiResponse({ status: 200, description: 'List of all categories with post count.' })
  findAll() {
    return this.categoriesService.findAll();
  }

  /**
   * [GET] /api/v1/categories/:id
   * ดึงข้อมูลหมวดหมู่ตาม ID พร้อมบทความที่อยู่ในหมวดหมู่นั้น (Public)
   */
  @Get(':id')
  @ApiOperation({ summary: 'Get a category by ID (Public)', description: 'Returns category details and its associated posts.' })
  @ApiParam({ name: 'id', type: Number, description: 'Category unique ID' })
  @ApiResponse({ status: 200, description: 'Category found.' })
  @ApiResponse({ status: 404, description: 'Category not found.' })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.categoriesService.findOne(id);
  }

  /**
   * [PATCH] /api/v1/categories/:id
   * แก้ไขชื่อหมวดหมู่ (เฉพาะ ADMIN)
   */
  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update a category (Admin only)', description: 'Requires ADMIN role.' })
  @ApiParam({ name: 'id', type: Number, description: 'Category ID to update' })
  @ApiResponse({ status: 200, description: 'Category successfully updated.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 403, description: 'Forbidden - Requires ADMIN role.' })
  @ApiResponse({ status: 404, description: 'Category not found.' })
  update(@Param('id', ParseIntPipe) id: number, @Body() updateCategoryDto: UpdateCategoryDto) {
    return this.categoriesService.update(id, updateCategoryDto);
  }

  /**
   * [DELETE] /api/v1/categories/:id
   * ลบหมวดหมู่ (เฉพาะ ADMIN)
   */
  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete a category (Admin only)', description: 'Requires ADMIN role.' })
  @ApiParam({ name: 'id', type: Number, description: 'Category ID to delete' })
  @ApiResponse({ status: 200, description: 'Category successfully deleted.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 403, description: 'Forbidden - Requires ADMIN role.' })
  @ApiResponse({ status: 404, description: 'Category not found.' })
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.categoriesService.remove(id);
  }
}
