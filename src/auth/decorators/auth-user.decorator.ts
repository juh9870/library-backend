import { createParamDecorator, ExecutionContext } from '@nestjs/common';

import { UserSchema } from '../../../prisma/generated/zod';

export const AuthUser = createParamDecorator(
  (isRequired: boolean | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest() as unknown as {
      user?: unknown;
    };

    if (!UserSchema.safeParse(request.user).success && (isRequired ?? true))
      throw new Error(`${request.user} is not an instance of User`);
    return request.user;
  },
);
