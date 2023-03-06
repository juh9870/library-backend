import { createZodDto } from '@anatine/zod-nestjs';
import { extendApi } from '@anatine/zod-openapi';
import { z } from 'zod';

export const LoginSchema = z.object({
  username: z.string(),
  password: z.string(),
});

const LoginSchemaDtoApi = extendApi(LoginSchema, {
  example: {
    username: 'admin',
    password: 'Stringst1#',
  },
});

export class LoginDto extends createZodDto(LoginSchemaDtoApi) {}
