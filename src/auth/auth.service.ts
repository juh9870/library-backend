import {
  BadRequestException,
  ConflictException,
  Injectable,
  InternalServerErrorException,
  UnauthorizedException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import type { Request } from 'express';
import { PrismaService } from 'nestjs-prisma';
import type { ReadonlyDeep } from 'type-fest';

import { ConfigService } from '../config/config.service';
import type { UserDto } from '../users/dto/user.dto';
import { UsersService } from '../users/users.service';
import type { RegisterDto } from './dto/register.dto';

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly config: ConfigService,
    private prisma: PrismaService,
  ) {}

  async validateUser(username: string, password: string): Promise<UserDto> {
    const user = await this.usersService.findByUsername(username);

    if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
      throw new UnauthorizedException('Invalid credentials');
    }

    return user;
  }

  async register(data: ReadonlyDeep<RegisterDto>): Promise<UserDto> {
    const existingUser = await this.usersService.findByUsername(data.username);
    if (existingUser)
      throw new ConflictException(
        `User with the name ${data.username} already exists`,
      );
    if (
      !data.password.match(
        /^(?=.*?[A-Z])(?=.*?[a-z])(?=.*?[0-9])(?=.*?[#?!@$%^&*-]).{8,}$/,
      )
    ) {
      throw new BadRequestException('Invalid password');
    }
    const pwdHash = await bcrypt.hash(data.password, this.config.SALT_ROUNDS);
    return this.usersService.createUser({
      username: data.username,
      passwordHash: pwdHash,
    });
  }

  async logout(request: Request): Promise<void> {
    const logoutError = await new Promise((resolve) =>
      request.logOut({ keepSessionInfo: false }, (error) => resolve(error)),
    );

    if (logoutError) {
      console.error(logoutError);

      throw new InternalServerErrorException('Could not log out user');
    }
  }

  async invalidateAllSessions(
    request: Request,
    user: UserDto,
  ): Promise<boolean> {
    await this.logout(request);
    await this.prisma.session.deleteMany({
      where: {
        data: {
          contains: user.id,
        },
      },
    });
    return true;
  }
}
