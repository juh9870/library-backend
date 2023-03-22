import { createZodDto } from '@anatine/zod-nestjs';
import { z } from 'zod';

export const AuthTokenSchema = z.object({
  accessToken: z.string(),
});

export class AuthTokenDto extends createZodDto(AuthTokenSchema) {}

export const RefreshTokenSchema = AuthTokenSchema.extend({
  refreshToken: z.string(),
});

export class RefreshTokenDto extends createZodDto(RefreshTokenSchema) {}
