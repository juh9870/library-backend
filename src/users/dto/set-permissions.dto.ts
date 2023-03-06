import { createZodDto } from '@anatine/zod-nestjs';
import { extendApi } from '@anatine/zod-openapi';

import { PermissionSchema, UserSchema } from '../../../prisma/generated/zod';

export const SetPermissionsDtoSchema = UserSchema.shape.permissions;

const SetPermissionsDtoApi = extendApi(SetPermissionsDtoSchema, {
  example: Object.values(PermissionSchema.Enum),
});

export class SetPermissionsDto extends createZodDto(SetPermissionsDtoApi) {}
