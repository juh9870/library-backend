import type { Request } from 'express';

import type { UserEntity } from '../users/entity/user.entity';
import { BooksService } from './books.service';
import type { BookEntity } from './entities/book.entity';

type PartialBookWithState = Partial<BookEntity> & Pick<BookEntity, 'state'>;

export function book(
  data: PartialBookWithState | ((user: UserEntity) => PartialBookWithState),
): [
  typeof BooksService,
  (_: BooksService, req: Request) => Promise<Awaited<BookEntity>>,
] {
  return [
    BooksService,
    (_: BooksService, req: Request) => {
      const readyData =
        typeof data === 'object' ? data : data(req.user as UserEntity);
      return Promise.resolve({
        id: 'invalid',
        userId: null,
        imageFile: null,
        bookFile: null,
        tags: [],
        description: '',
        published_date: null,
        title: '',
        ...readyData,
      });
    },
  ];
}

export function bookId(
  id: (req: Request) => BookEntity['id'] = (req) => req.params['id'],
): [
  typeof BooksService,
  (_: BooksService, req: Request) => Promise<Awaited<BookEntity>>,
] {
  return [
    BooksService,
    (service: BooksService, req: Request) => {
      return service.findById(id(req));
    },
  ];
}
