import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import type { Request } from 'express';

import { PermissionSchema } from '../../../prisma/generated/zod';
import type { UserEntity } from '../../users/entity/user.entity';

@Injectable()
export class IsAdminGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest() as Request;

    if (!request.isAuthenticated()) throw new UnauthorizedException();
    if (
      !(request.user as UserEntity).permissions.includes(
        PermissionSchema.Enum.ADMIN,
      )
    )
      throw new ForbiddenException();
    return true;
  }
}
