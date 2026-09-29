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
import { PostsService } from './posts.service.js';
import { CreatePostDto } from './dto/create-post.dto.js';
import { UpdatePostDto } from './dto/update-post.dto.js';

/**
 * ==============================================================================
 * 📝 PostsController (API Version 1: Standard CRUD)
 * ==============================================================================
 * เส้นทาง Base URL: `/api/v1/posts`
 * ให้บริการ CRUD บทความแบบดั้งเดิม (ส่งค่ากลับเป็น Raw Array)
 *
 * 💡 Backend Architecture Concept:
 * - API Versioning ช่วยรักษา Backward Compatibility (ความเข้ากันได้กับระบบเดิม)
 * - ลูกค้าหรือ Mobile App เวอร์ชันเก่าที่ยังเรียกใช้ /api/v1 จะไม่พัง แม้เราจะพัฒนา v2 ขึ้นมา
 * ==============================================================================
 */
@ApiTags('Posts (v1)')
@Controller({ path: 'posts', version: '1' })
export class PostsController {
  constructor(private readonly postsService: PostsService) {}

  /**
   * [POST] /api/v1/posts
   * สร้างบทความใหม่
   */
  @Post()
  @ApiOperation({ summary: 'Create a new post', description: 'Creates a post associated with an author and category.' })
  @ApiResponse({ status: 201, description: 'Post successfully created.' })
  @ApiResponse({ status: 400, description: 'Validation failed.' })
  @ApiResponse({ status: 404, description: 'Author or Category not found.' })
  create(@Body() createPostDto: CreatePostDto) {
    return this.postsService.create(createPostDto);
  }

  /**
   * [GET] /api/v1/posts
   * ดึงรายการบทความทั้งหมด (V1: คืนค่าเป็น Array ทั้งหมด)
   */
  @Get()
  @ApiOperation({ summary: 'Get all posts (v1)', description: 'Returns all posts in a single flat array without pagination.' })
  @ApiResponse({ status: 200, description: 'List of all posts with author and category.' })
  findAll() {
    return this.postsService.findAll();
  }

  /**
   * [GET] /api/v1/posts/published
   * ดึงเฉพาะบทความที่เผยแพร่แล้ว
   */
  @Get('published')
  @ApiOperation({ summary: 'Get all published posts', description: 'Returns only posts where isPublished is true.' })
  @ApiResponse({ status: 200, description: 'List of published posts.' })
  findPublished() {
    return this.postsService.findPublished();
  }

  /**
   * [GET] /api/v1/posts/:id
   * ดึงบทความตาม ID
   */
  @Get(':id')
  @ApiOperation({ summary: 'Get a post by ID', description: 'Returns post details with author and category.' })
  @ApiParam({ name: 'id', type: Number, description: 'Post ID' })
  @ApiResponse({ status: 200, description: 'Post found.' })
  @ApiResponse({ status: 404, description: 'Post not found.' })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.postsService.findOne(id);
  }

  /**
   * [PATCH] /api/v1/posts/:id
   * แก้ไขบทความ
   */
  @Patch(':id')
  @ApiOperation({ summary: 'Update a post', description: 'Partially updates post content, title, or category.' })
  @ApiParam({ name: 'id', type: Number, description: 'Post ID' })
  @ApiResponse({ status: 200, description: 'Post successfully updated.' })
  @ApiResponse({ status: 404, description: 'Post or Category not found.' })
  update(@Param('id', ParseIntPipe) id: number, @Body() updatePostDto: UpdatePostDto) {
    return this.postsService.update(id, updatePostDto);
  }

  /**
   * [DELETE] /api/v1/posts/:id
   * ลบบทความ
   */
  @Delete(':id')
  @ApiOperation({ summary: 'Delete a post', description: 'Deletes a post by ID.' })
  @ApiParam({ name: 'id', type: Number, description: 'Post ID' })
  @ApiResponse({ status: 200, description: 'Post successfully deleted.' })
  @ApiResponse({ status: 404, description: 'Post not found.' })
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.postsService.remove(id);
  }
}
