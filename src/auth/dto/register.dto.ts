import { createZodDto } from '@anatine/zod-nestjs';
import { extendApi } from '@anatine/zod-openapi';
import { z } from 'zod';

import { UserSchema } from '../../../prisma/generated/zod';

export const RegisterSchema = UserSchema.pick({ username: true }).extend({
  password: z.string().min(8),
});

const RegisterSchemaDtoApi = extendApi(RegisterSchema, {
  example: {
    username: 'admin',
    password: 'Stringst1#',
  },
});

export class RegisterDto extends createZodDto(RegisterSchemaDtoApi) {}
