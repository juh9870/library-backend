import { Body, Controller, Get, Post, Req, UseGuards } from '@nestjs/common';
import {
  ApiBody,
  ApiCookieAuth,
  ApiCreatedResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import type { Request } from 'express';

import { UserEntity } from '../users/entity/user.entity';
import { AuthService } from './auth.service';
import { AuthUser } from './decorators/auth-user.decorator';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { IsAuthenticatedGuard } from './guards/is-authenticated.guard';
import { LocalAuthGuard } from './guards/local-auth.guard';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @UseGuards(LocalAuthGuard)
  @Post('login')
  @ApiBody({
    type: LoginDto,
  })
  async login(): Promise<boolean> {
    return true;
  }

  @Post('register')
  async register(@Body() data: RegisterDto): Promise<boolean> {
    await this.authService.register(data);
    return true;
  }

  @UseGuards(IsAuthenticatedGuard)
  @Post('logout')
  @ApiOperation({ description: 'Invalidates current session' })
  @ApiCreatedResponse({
    description: 'Logged out successfully',
  })
  async logout(@Req() request: Request): Promise<void> {
    return this.authService.logout(request);
  }

  @UseGuards(IsAuthenticatedGuard)
  @Post('invalidateAllSessions')
  @ApiOperation({
    description: 'Invalidates all sessions of the current user on all devices',
  })
  @ApiCreatedResponse({
    description: 'Logged out successfully',
  })
  @ApiCookieAuth()
  async invalidateAllSessions(
    @Req() request: Request,
    @AuthUser() user: UserEntity,
  ): Promise<boolean> {
    return this.authService.invalidateAllSessions(request, user);
  }

  @ApiOperation({ description: 'Demo endpoint' })
  @UseGuards(IsAuthenticatedGuard)
  @Get('protected')
  async protected(): Promise<unknown> {
    return {
      message: 'This route is protected against unauthenticated users!',
    };
  }
}
