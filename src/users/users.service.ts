import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'nestjs-prisma';
import type { z } from 'zod';

import type {
  PermissionType,
  UserCreateInputSchema,
} from '../../prisma/generated/zod';
import { PermissionSchema } from '../../prisma/generated/zod';
import type { SetPermissionsDto } from './dto/set-permissions.dto';
import type { UserEntity } from './entity/user.entity';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  public findById(id: string): Promise<UserEntity | null> {
    return this.prisma.user.findUnique({ where: { id: id } });
  }

  public findByUsername(username: string): Promise<UserEntity | null> {
    return this.prisma.user.findUnique({ where: { username: username } });
  }

  public async createUser(
    data: z.infer<typeof UserCreateInputSchema>,
  ): Promise<UserEntity> {
    const perms: PermissionType[] = [];
    if ((await this.prisma.user.count()) == 0) {
      perms.push(PermissionSchema.Enum.ADMIN);
    } else {
      perms.push(PermissionSchema.Enum.CREATE);
    }
    return this.prisma.user.create({
      data: {
        ...data,
        lastTokenReset: new Date(0),
        permissions: perms,
      },
    });
  }

  public async findOneOrThrow(id: string): Promise<UserEntity> {
    const user = await this.findById(id);
    if (!user) throw new NotFoundException();
    return user;
  }

  public async getAll(): Promise<UserEntity[]> {
    return this.prisma.user.findMany();
  }

  public setPermissions(
    id: string,
    data: SetPermissionsDto,
  ): Promise<UserEntity> {
    return this.prisma.user.update({
      where: { id },
      data: {
        permissions: data,
      },
    });
  }
}
