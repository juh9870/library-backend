import { createZodDto } from '@anatine/zod-nestjs';
import { z } from 'zod';

export const TokenEntitySchema = z.object({
  sub: z.string().uuid(),
  iat: z.number().int(),
  exp: z.number().int(),
});

export class TokenEntity extends createZodDto(TokenEntitySchema) {}

export const AuthEntitySchema = TokenEntitySchema.extend({
  refreshHash: z.string(),
});

export class AuthEntity extends createZodDto(AuthEntitySchema) {}
