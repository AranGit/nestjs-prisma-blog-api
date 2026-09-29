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
import type { User } from '@prisma/client';
import { PostsService } from './posts.service.js';
import { CreatePostDto } from './dto/create-post.dto.js';
import { UpdatePostDto } from './dto/update-post.dto.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';

/**
 * ==============================================================================
 * 📝 PostsController (API Version 1: Standard CRUD)
 * ==============================================================================
 * เส้นทาง Base URL: `/api/v1/posts`
 * ให้บริการ CRUD บทความแบบดั้งเดิม (ส่งค่ากลับเป็น Raw Array)
 *
 * 💡 Security & Authorization:
 * - `GET`: เปิด Public ให้ใครก็อ่านบทความได้
 * - `POST`: ต้องล็อกอิน (JWT) -> ระบบจะดึง authorId จาก Token อัตโนมัติ
 * - `PATCH`, `DELETE`: ต้องล็อกอิน -> Author แก้ได้เฉพาะโพสต์ของตัวเอง, Admin แก้ได้ทุกคน
 * ==============================================================================
 */
@ApiTags('Posts (v1)')
@Controller({ path: 'posts', version: '1' })
export class PostsController {
  constructor(private readonly postsService: PostsService) {}

  /**
   * [POST] /api/v1/posts
   * สร้างบทความใหม่ (ต้องล็อกอิน)
   */
  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a new post (Authenticated)', description: 'Author ID is automatically set from the JWT token.' })
  @ApiResponse({ status: 201, description: 'Post successfully created.' })
  @ApiResponse({ status: 400, description: 'Validation failed.' })
  @ApiResponse({ status: 401, description: 'Unauthorized - Missing or invalid token.' })
  @ApiResponse({ status: 404, description: 'Category not found.' })
  create(
    @Body() createPostDto: CreatePostDto,
    @CurrentUser('id') userId: number,
  ) {
    return this.postsService.create(createPostDto, userId);
  }

  /**
   * [GET] /api/v1/posts
   * ดึงรายการบทความทั้งหมด (Public)
   */
  @Get()
  @ApiOperation({ summary: 'Get all posts (v1, Public)', description: 'Returns all posts in a single flat array without pagination.' })
  @ApiResponse({ status: 200, description: 'List of all posts with author and category.' })
  findAll() {
    return this.postsService.findAll();
  }

  /**
   * [GET] /api/v1/posts/published
   * ดึงเฉพาะบทความที่เผยแพร่แล้ว (Public)
   */
  @Get('published')
  @ApiOperation({ summary: 'Get all published posts (Public)', description: 'Returns only posts where isPublished is true.' })
  @ApiResponse({ status: 200, description: 'List of published posts.' })
  findPublished() {
    return this.postsService.findPublished();
  }

  /**
   * [GET] /api/v1/posts/:id
   * ดึงบทความตาม ID (Public)
   */
  @Get(':id')
  @ApiOperation({ summary: 'Get a post by ID (Public)', description: 'Returns post details with author and category.' })
  @ApiParam({ name: 'id', type: Number, description: 'Post ID' })
  @ApiResponse({ status: 200, description: 'Post found.' })
  @ApiResponse({ status: 404, description: 'Post not found.' })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.postsService.findOne(id);
  }

  /**
   * [PATCH] /api/v1/posts/:id
   * แก้ไขบทความ (ต้องเป็นผู้เขียนบทความ หรือเป็น ADMIN)
   */
  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update a post (Owner or Admin)', description: 'Authors can only update their own posts; Admins can update any.' })
  @ApiParam({ name: 'id', type: Number, description: 'Post ID' })
  @ApiResponse({ status: 200, description: 'Post successfully updated.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 403, description: 'Forbidden - You do not own this post.' })
  @ApiResponse({ status: 404, description: 'Post or Category not found.' })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updatePostDto: UpdatePostDto,
    @CurrentUser() user: User,
  ) {
    return this.postsService.update(id, updatePostDto, user);
  }

  /**
   * [DELETE] /api/v1/posts/:id
   * ลบบทความ (ต้องเป็นผู้เขียนบทความ หรือเป็น ADMIN)
   */
  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete a post (Owner or Admin)', description: 'Authors can only delete their own posts; Admins can delete any.' })
  @ApiParam({ name: 'id', type: Number, description: 'Post ID' })
  @ApiResponse({ status: 200, description: 'Post successfully deleted.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 403, description: 'Forbidden - You do not own this post.' })
  @ApiResponse({ status: 404, description: 'Post not found.' })
  remove(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: User,
  ) {
    return this.postsService.remove(id, user);
  }
}
