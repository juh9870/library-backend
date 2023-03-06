import { createZodDto } from '@anatine/zod-nestjs';

import { TagSchema, TagTypeSchema } from '../../../prisma/generated/zod';

export class TagEntity extends createZodDto(TagSchema) {}

export const TagType = TagTypeSchema.Enum;
