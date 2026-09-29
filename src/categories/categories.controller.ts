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
import { CategoriesService } from './categories.service.js';
import { CreateCategoryDto } from './dto/create-category.dto.js';
import { UpdateCategoryDto } from './dto/update-category.dto.js';

/**
 * ==============================================================================
 * 🏷️ CategoriesController (HTTP Controller สำหรับจัดการหมวดหมู่)
 * ==============================================================================
 * เส้นทาง Base URL: `/api/v1/categories`
 * จัดเตรียม RESTful Endpoints สำหรับการทำ CRUD กับ Category
 * ==============================================================================
 */
@ApiTags('Categories')
@Controller({ path: 'categories', version: '1' })
export class CategoriesController {
  constructor(private readonly categoriesService: CategoriesService) {}

  /**
   * [POST] /api/v1/categories
   * สร้างหมวดหมู่ใหม่
   */
  @Post()
  @ApiOperation({ summary: 'Create a new category', description: 'Creates a unique blog category.' })
  @ApiResponse({ status: 201, description: 'Category successfully created.' })
  @ApiResponse({ status: 400, description: 'Validation failed.' })
  @ApiResponse({ status: 409, description: 'Category name already exists.' })
  create(@Body() createCategoryDto: CreateCategoryDto) {
    return this.categoriesService.create(createCategoryDto);
  }

  /**
   * [GET] /api/v1/categories
   * ดึงรายการหมวดหมู่ทั้งหมด พร้อมจำนวนบทความในแต่ละหมวดหมู่
   */
  @Get()
  @ApiOperation({ summary: 'Get all categories', description: 'Returns a list of all categories sorted alphabetically with post count.' })
  @ApiResponse({ status: 200, description: 'List of all categories with post count.' })
  findAll() {
    return this.categoriesService.findAll();
  }

  /**
   * [GET] /api/v1/categories/:id
   * ดึงข้อมูลหมวดหมู่ตาม ID พร้อมบทความที่อยู่ในหมวดหมู่นั้น
   */
  @Get(':id')
  @ApiOperation({ summary: 'Get a category by ID', description: 'Returns category details and its associated posts.' })
  @ApiParam({ name: 'id', type: Number, description: 'Category unique ID' })
  @ApiResponse({ status: 200, description: 'Category found.' })
  @ApiResponse({ status: 404, description: 'Category not found.' })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.categoriesService.findOne(id);
  }

  /**
   * [PATCH] /api/v1/categories/:id
   * แก้ไขชื่อหมวดหมู่
   */
  @Patch(':id')
  @ApiOperation({ summary: 'Update a category', description: 'Updates existing category attributes.' })
  @ApiParam({ name: 'id', type: Number, description: 'Category ID to update' })
  @ApiResponse({ status: 200, description: 'Category successfully updated.' })
  @ApiResponse({ status: 404, description: 'Category not found.' })
  @ApiResponse({ status: 409, description: 'Category name already exists on another category.' })
  update(@Param('id', ParseIntPipe) id: number, @Body() updateCategoryDto: UpdateCategoryDto) {
    return this.categoriesService.update(id, updateCategoryDto);
  }

  /**
   * [DELETE] /api/v1/categories/:id
   * ลบหมวดหมู่
   */
  @Delete(':id')
  @ApiOperation({ summary: 'Delete a category', description: 'Deletes a category if it has no associated posts.' })
  @ApiParam({ name: 'id', type: Number, description: 'Category ID to delete' })
  @ApiResponse({ status: 200, description: 'Category successfully deleted.' })
  @ApiResponse({ status: 404, description: 'Category not found.' })
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.categoriesService.remove(id);
  }
}
