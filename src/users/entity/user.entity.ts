import { createZodDto } from '@anatine/zod-nestjs';
import { extendApi } from '@anatine/zod-openapi';

import { UserSchema } from '../../../prisma/generated/zod';

export const UserApi = extendApi(UserSchema);

export class UserEntity extends createZodDto(UserApi) {}
