import { Controller, Post, Get, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { AuthService } from './auth.service.js';
import { RegisterDto } from './dto/register.dto.js';
import { LoginDto } from './dto/login.dto.js';
import { AuthResponseDto } from './dto/auth-response.dto.js';
import { JwtAuthGuard } from './guards/jwt-auth.guard.js';
import { CurrentUser } from './decorators/current-user.decorator.js';

/**
 * ==============================================================================
 * 🔐 AuthController (Authentication & Profile Endpoints)
 * ==============================================================================
 * ให้บริการ Endpoint สำหรับสมัครสมาชิก, เข้าสู่ระบบ และดูข้อมูลส่วนตัว
 * เส้นทาง Base URL: `/api/v1/auth`
 * ==============================================================================
 */
@ApiTags('Authentication')
@Controller({ path: 'auth', version: '1' })
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  /**
   * [POST] /api/v1/auth/register
   * สมัครสมาชิกใหม่
   */
  @Post('register')
  @ApiOperation({ summary: 'Register a new user account', description: 'Creates a user with hashed password and returns a JWT token.' })
  @ApiResponse({ status: 201, description: 'User successfully registered.', type: AuthResponseDto })
  @ApiResponse({ status: 400, description: 'Validation failed.' })
  @ApiResponse({ status: 409, description: 'Email is already registered.' })
  register(@Body() registerDto: RegisterDto): Promise<AuthResponseDto> {
    return this.authService.register(registerDto);
  }

  /**
   * [POST] /api/v1/auth/login
   * เข้าสู่ระบบด้วย Email และ Password
   */
  @Post('login')
  @ApiOperation({ summary: 'User login', description: 'Authenticates credentials and returns a JWT access token.' })
  @ApiResponse({ status: 200, description: 'Login successful.', type: AuthResponseDto })
  @ApiResponse({ status: 401, description: 'Invalid email or password.' })
  login(@Body() loginDto: LoginDto): Promise<AuthResponseDto> {
    return this.authService.login(loginDto);
  }

  /**
   * [GET] /api/v1/auth/profile
   * ดูข้อมูลส่วนตัวของผู้ใช้งานที่ล็อกอินอยู่ (Protected Route)
   */
  @Get('profile')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get current user profile', description: 'Returns profile of the currently authenticated user.' })
  @ApiResponse({ status: 200, description: 'Profile retrieved successfully.' })
  @ApiResponse({ status: 401, description: 'Unauthorized - Invalid or missing token.' })
  getProfile(@CurrentUser('id') userId: number) {
    return this.authService.getProfile(userId);
  }
}
