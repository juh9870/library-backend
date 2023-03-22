import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiOkResponse,
  ApiTags,
} from '@nestjs/swagger';

import { UserEntity } from '../users/entity/user.entity';
import { AuthService } from './auth.service';
import { BearerAuthToken } from './decorators/auth-token.decorator';
import { AuthUser } from './decorators/auth-user.decorator';
import { Public } from './decorators/public.decorator';
import { AuthTokenDto, RefreshTokenDto } from './dto/auth-token.dto';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { JwtRefreshGuard } from './guards/jwt-refresh.guard';
import { LocalAuthGuard } from './guards/local-auth.guard';

@Controller('auth')
@ApiTags('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  /**
   * Logs-in user with provided username and password.<br>
   * This endpoint creates new refresh token on every request. First auth token is also generated
   * and returned in the same response, but for refreshing access token you should use
   * /auth/refresh endpoint using refresh token instead of calling this endpoint again
   */
  @ApiCreatedResponse({
    description: 'Tokens were successfully created',
    type: RefreshTokenDto,
  })
  @Public()
  @UseGuards(LocalAuthGuard)
  @Post('login')
  async login(
    @Body()
    user: LoginDto,
  ): Promise<RefreshTokenDto> {
    return this.authService.login(user);
  }

  /**
   * Retrieves new access token with provided refresh token
   */
  @Public()
  @ApiBearerAuth()
  @UseGuards(JwtRefreshGuard)
  @ApiCreatedResponse({
    description: 'Access Token was created successfully',
    type: AuthTokenDto,
  })
  @ApiForbiddenResponse({
    description: 'Provided refresh token was not found in valid tokens list',
  })
  @Post('refresh')
  async refresh(
    @AuthUser() user: UserEntity,
    @BearerAuthToken() token: string,
  ): Promise<AuthTokenDto> {
    return this.authService.refresh(user, token);
  }

  /**
   * Registers a new user
   */
  @Public()
  @ApiCreatedResponse({
    description: 'The user has been successfully created',
    type: UserEntity,
  })
  @ApiConflictResponse({
    description: 'Username is already used by another user',
  })
  @Post('/register')
  register(@Body() createUserDto: RegisterDto): Promise<UserEntity> {
    return this.authService.register(createUserDto);
  }

  /**
   * Logs out current user from the system, invalidating refresh token of the current session
   */
  @ApiBearerAuth()
  @ApiOkResponse({
    description: 'Logged out successfully',
  })
  @Get('/logout')
  logout(
    @AuthUser() user: UserEntity,
    @BearerAuthToken() token: string,
  ): Promise<void> {
    return this.authService.logout(user, token);
  }
}
