import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { compare, hash } from 'bcrypt';
import * as crypto from 'crypto';
import { PrismaService } from 'nestjs-prisma';
import type { ZodType } from 'zod';

import type { User } from '../../prisma/generated/zod';
import { ConfigService } from '../config/config.service';
import type { UserEntity } from '../users/entity/user.entity';
import { UsersService } from '../users/users.service';
import type { AuthTokenDto, RefreshTokenDto } from './dto/auth-token.dto';
import type { LoginDto } from './dto/login.dto';
import type { RegisterDto } from './dto/register.dto';
import {
  AuthEntitySchema,
  TokenEntity,
  TokenEntitySchema,
} from './entities/auth.entity';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private config: ConfigService,
    private prisma: PrismaService,
    private jwtService: JwtService,
  ) {}

  async register(data: RegisterDto): Promise<UserEntity> {
    const existingUser = await this.usersService.findByUsername(data.username);
    if (existingUser)
      throw new ConflictException(
        `User with the name ${data.username} already exists`,
      );
    if (!data.password.match(/^(?=.*?[A-Z])(?=.*?[a-z])(?=.*?[0-9]).{8,}$/)) {
      throw new BadRequestException('Invalid password');
    }
    const pwdHash = await hash(data.password, this.config.SALT_ROUNDS);
    return this.usersService.createUser({
      username: data.username,
      passwordHash: pwdHash,
    });
  }

  async validateUser(userDto: LoginDto): Promise<User | null> {
    const user = await this.usersService.findByUsername(userDto.username);
    if (user && (await compare(userDto.password, user.passwordHash))) {
      return user;
    }
    return null;
  }

  /**
   * Returns refresh and access tokens for the given use Dto.<br>
   * User credentials are NOT validated in this method
   * @param userDto - user authorization DTO
   */
  async login(userDto: LoginDto): Promise<RefreshTokenDto> {
    const user = await this.usersService.findByUsername(userDto.username);
    if (!user) throw new UnauthorizedException();
    const payload: object = {
      sub: user.id,
    };

    const token = this.jwtService.sign(payload, {
      expiresIn: this.config.JWT_REFRESH_TOKEN_EXPIRATION_TIME,
      secret: this.config.JWT_REFRESH_TOKEN_SECRET,
    });

    const hash = await this.tokenHash(token);
    const decodedToken = this.jwtService.decode(token);
    const parsedToken = TokenEntitySchema.parse(decodedToken);

    await this.prisma.token.upsert({
      where: {
        hash: hash,
      },
      update: {},
      create: {
        hash: hash,
        userId: user.id,
        expiresAt: new Date(parsedToken.exp * 1000),
      },
    });
    const authToken = await this.refresh(user, token);
    return {
      accessToken: authToken.accessToken,
      refreshToken: token,
    };
  }

  async logout(_user: User, rawToken: string): Promise<void> {
    const auth = AuthEntitySchema.parse(this.jwtService.decode(rawToken));
    await this.prisma.token.delete({
      where: {
        hash: auth.refreshHash,
      },
    });
  }

  async refresh(user: User, rawToken: string): Promise<AuthTokenDto> {
    const hash = await this.tokenHash(rawToken);
    await this.validateRefreshToken(hash);
    const payload = {
      sub: user.id,
      refreshHash: hash,
    };
    return {
      accessToken: this.jwtService.sign(payload, {
        expiresIn: this.config.JWT_ACCESS_TOKEN_EXPIRATION_TIME,
        secret: this.config.JWT_ACCESS_TOKEN_SECRET,
      }),
    };
  }

  async tokenHash(rawToken: string): Promise<string> {
    return crypto.createHash('sha256').update(rawToken).digest('base64');
  }

  async validateRefreshToken(tokenHash: string): Promise<void> {
    const token = await this.prisma.token.findUnique({
      where: {
        hash: tokenHash,
      },
    });
    if (token === null || Date.now() > token.expiresAt.getTime()) {
      throw new ForbiddenException(
        'Refresh token was not found in valid refresh tokens list',
      );
    }
  }

  async validatePayload<T extends TokenEntity>(
    schema: ZodType<T>,
    payload: unknown,
  ): Promise<User> {
    const auth = schema.parse(payload);
    let user;
    try {
      user = await this.usersService.findOneOrThrow(auth.sub);
    } catch (e) {
      if (e instanceof NotFoundException)
        throw new UnauthorizedException("User can't be found");
      throw e;
    }
    if (user.lastTokenReset.getTime() / 1000 > auth.iat) {
      throw new UnauthorizedException('Token has been revoked');
    }
    return user;
  }
}
