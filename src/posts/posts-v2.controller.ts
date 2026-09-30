import {
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Query,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam } from '@nestjs/swagger';
import { PostsService } from './posts.service.js';
import { QueryPostV2Dto } from './dto/query-post-v2.dto.js';

/**
 * ==============================================================================
 * PostsV2Controller (API Version 2: Advanced Endpoints)
 * ==============================================================================
 * เส้นทาง Base URL: `/api/v2/posts`
 * นำเสนอฟีเจอร์ขั้นสูงสำหรับบทความ เช่น การแบ่งหน้า (Pagination), ค้นหา (Search),
 * สถิติภาพรวม (Analytics) และข้อมูลคำนวณเวลาในการอ่าน (Reading Time)
 *
 * Critical Backend Concept: Route Order / Route Precedence (ลำดับความสำคัญของ Route)
 * สังเกตว่า `@Get('stats')` ต้องประกาศ "ก่อน" `@Get(':id')` เสมอ!
 * เหตุผล:
 * - ถ้าประกาศ `@Get(':id')` ก่อน เมื่อมีคำขอมาที่ `/posts/stats` Express/NestJS จะมองว่า
 *   คำว่า "stats" คือค่าพารามิเตอร์ `:id` และพยายามแปลงเป็น UUID ด้วย `ParseUUIDPipe`
 * - ผลลัพธ์คือเกิด Error 400 "Validation failed (uuid is expected)" ทันที!
 * - ดังนั้น Static route (`stats`, `published`) ต้องอยู่ก่อน Dynamic parameter route (`:id`) เสมอ
 * ==============================================================================
 */
@ApiTags('Posts (v2)')
@Controller({ path: 'posts', version: '2' })
export class PostsV2Controller {
  constructor(private readonly postsService: PostsService) {}

  /**
   * [GET] /api/v2/posts
   * ดึงบทความแบบแบ่งหน้า (Pagination) และค้นหาตาม Keyword หรือ Category
   * รองรับ Query Parameters: ?page=1&limit=10&search=NestJS&categoryId=019245bb-8e34-7389-9a74-9f8263590002
   */
  @Get()
  @ApiOperation({
    summary: 'Get all posts with pagination and search (v2)',
    description: 'Returns paginated posts with metadata, search by keyword, and filter by category.',
  })
  @ApiResponse({
    status: 200,
    description: 'Paginated posts with metadata (total, page, totalPages, hasNextPage).',
  })
  findAll(@Query() query: QueryPostV2Dto) {
    return this.postsService.findAllV2(query);
  }

  /**
   * [GET] /api/v2/posts/stats
   * ดึงสถิติภาพรวม เช่น จำนวนบทความทั้งหมด, บทความที่เผยแพร่แล้ว, จำนวนหมวดหมู่
   */
  @Get('stats')
  @ApiOperation({
    summary: 'Get blog posts statistics (v2)',
    description: 'Returns aggregate metrics including total posts, published vs draft counts, and total categories/users.',
  })
  @ApiResponse({ status: 200, description: 'Blog statistics summary.' })
  getStats() {
    return this.postsService.getStatsV2();
  }

  /**
   * [GET] /api/v2/posts/:id
   * ดึงบทความเดี่ยว พร้อมคำนวณเวลาในการอ่าน (Reading Time) และแนะนำบทความที่เกี่ยวข้อง (Related Posts)
   */
  @Get(':id')
  @ApiOperation({
    summary: 'Get a post with reading time & related posts (v2)',
    description: 'Returns post details enriched with estimated reading time and related posts from the same category.',
  })
  @ApiParam({ name: 'id', type: String, description: 'Post UUID' })
  @ApiResponse({ status: 200, description: 'Post found with reading time and related posts.' })
  @ApiResponse({ status: 404, description: 'Post not found.' })
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.postsService.findOneV2(id);
  }
}
