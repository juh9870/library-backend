import { createZodDto } from '@anatine/zod-nestjs';
import { z } from 'zod';

export const LoginSchema = z.object({
  username: z.string(),
  password: z.string(),
});

export class LoginDto extends createZodDto(LoginSchema) {}
