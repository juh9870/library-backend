import { Injectable } from '@nestjs/common';
import { PrismaService } from 'nestjs-prisma';
import type { ReadonlyDeep } from 'type-fest';
import type { z } from 'zod';

import type { UserCreateInputSchema } from '../../prisma/generated/zod';
import type { UserDto } from './dto/user.dto';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  public findById(id: string): Promise<UserDto | null> {
    return this.prisma.user.findUnique({ where: { id: id } });
  }

  public findByUsername(username: string): Promise<UserDto | null> {
    return this.prisma.user.findUnique({ where: { username: username } });
  }

  public async createUser(
    data: ReadonlyDeep<z.infer<typeof UserCreateInputSchema>>,
  ): Promise<UserDto> {
    return this.prisma.user.create({ data });
  }
}
