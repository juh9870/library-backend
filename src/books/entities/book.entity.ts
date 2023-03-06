import { createZodDto } from '@anatine/zod-nestjs';
import { z } from 'zod';

import { BookSchema, TagSchema } from '../../../prisma/generated/zod';

export const BookEntitySchema = BookSchema.extend({
  tags: z.array(TagSchema.omit({ id: true })),
}).strict();

export class BookEntity extends createZodDto(BookEntitySchema) {}
