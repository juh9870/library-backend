import { createZodDto } from '@anatine/zod-nestjs';

import { CreateBookDtoSchema } from './create-book.dto';

export const UpdateBookSchema = CreateBookDtoSchema.partial();

export class UpdateBookDto extends createZodDto(UpdateBookSchema) {}
