import { createZodDto } from '@anatine/zod-nestjs';

import { BookEntitySchema } from '../entities/book.entity';

export const CreateBookDtoSchema = BookEntitySchema.omit({
  id: true,
  state: true,
  userId: true,
  bookFile: true,
  imageFile: true,
});

export class CreateBookDto extends createZodDto(CreateBookDtoSchema) {}
