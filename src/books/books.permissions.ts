import type { InferSubjects, Permissions } from 'nest-casl';
import { DefaultActions } from 'nest-casl';

import type { PermissionType } from '../../prisma/generated/zod';
import { BookStateSchema, PermissionSchema } from '../../prisma/generated/zod';
import { BookEntity } from './entities/book.entity';

export type Subjects = InferSubjects<typeof BookEntity>;

enum CustomActions {
  archive = 'archive',
  unarchive = 'unarchive',
  approve = 'approve',
}

export type BookActions = DefaultActions | CustomActions;
export const BookActions = { ...DefaultActions, ...CustomActions };

export const BooksPermissions: Permissions<
  PermissionType,
  Subjects,
  BookActions
> = {
  everyone({ can, user }) {
    can(BookActions.read, BookEntity, { state: BookStateSchema.Enum.VISIBLE });

    can(BookActions.read, BookEntity, {
      state: BookStateSchema.Enum.DRAFT,
      userId: user.id,
    });
    can(BookActions.update, BookEntity, {
      state: BookStateSchema.Enum.DRAFT,
      userId: user.id,
    });
    can(BookActions.delete, BookEntity, {
      state: BookStateSchema.Enum.DRAFT,
      userId: user.id,
    });
  },

  CREATE({ can }) {
    can(BookActions.create, BookEntity);
  },

  APPROVE({ can }) {
    can(BookActions.read, BookEntity, {
      state: BookStateSchema.Enum.UNAPPROVED,
    });
    can(BookActions.approve, BookEntity, {
      state: BookStateSchema.Enum.UNAPPROVED,
    });
  },

  ARCHIVE({ can }) {
    can(BookActions.read, BookEntity, { state: BookStateSchema.Enum.ARCHIVED });
    can(BookActions.archive, BookEntity, {
      state: BookStateSchema.Enum.VISIBLE,
    });
    can(BookActions.unarchive, BookEntity, {
      state: BookStateSchema.Enum.ARCHIVED,
    });
  },

  DELETE({ can, extend }) {
    extend(PermissionSchema.Enum.ARCHIVE);
    can(BookActions.delete, BookEntity, {
      state: BookStateSchema.Enum.ARCHIVED,
    });
  },

  EDIT({ can }) {
    can(BookActions.read, BookEntity, {
      state: BookStateSchema.Enum.UNAPPROVED,
    });
    can(BookActions.update, BookEntity, {
      state: BookStateSchema.Enum.UNAPPROVED,
    });
    can(BookActions.update, BookEntity, {
      state: BookStateSchema.Enum.VISIBLE,
    });
  },
};
