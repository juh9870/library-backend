import { createZodDto } from '@anatine/zod-nestjs';
import { z } from 'zod';

import { UserSchema } from '../../../prisma/generated/zod';

export const RegisterSchema = UserSchema.pick({ username: true }).extend({
  password: z.string().min(8),
});

export class RegisterDto extends createZodDto(RegisterSchema) {}
