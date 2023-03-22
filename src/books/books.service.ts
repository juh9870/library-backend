import {
  BadRequestException,
  Injectable,
  NotFoundException,
  OnApplicationBootstrap,
  StreamableFile,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import axios from 'axios';
import { randomUUID } from 'crypto';
import type { Response } from 'express';
import * as fs from 'fs';
import { PrismaService } from 'nestjs-prisma';
import { delayWhen, distinct, from, interval, lastValueFrom, map } from 'rxjs';
import { z } from 'zod';

import {
  BookStateSchema,
  BookWhereInputSchema,
  TagTypeSchema,
} from '../../prisma/generated/zod';
import { FilesService } from '../files/files.service';
import type { UserEntity } from '../users/entity/user.entity';
import type { CreateBookDto } from './dto/create-book.dto';
import type { UpdateBookDto } from './dto/update-book.dto';
import type { BookEntity } from './entities/book.entity';
import type { TagEntity } from './entities/tag.entity';

export interface BookProxy {
  get(): Promise<BookEntity>;
}

function getTypeName(e: Pick<TagEntity, 'type' | 'name'>): {
  type_name: Pick<TagEntity, 'type' | 'name'>;
} {
  return {
    type_name: {
      type: e.type,
      name: e.name,
    },
  };
}

@Injectable()
export class BooksService implements OnApplicationBootstrap {
  constructor(
    private prisma: PrismaService,
    private filesService: FilesService,
  ) {}

  public async findById(id: string): Promise<BookEntity> {
    try {
      return await this.prisma.book.findUniqueOrThrow({
        where: { id: id },
        include: { tags: true },
      });
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError) {
        if (e.code === 'P2023') throw new BadRequestException();
        if (e.code === 'P2025') throw new NotFoundException();
      }
      throw e;
    }
  }

  async create(
    createBookDto: CreateBookDto,
    user: UserEntity,
  ): Promise<BookEntity> {
    const { tags, ...data } = createBookDto;
    return await this.prisma.book.create({
      data: {
        state: BookStateSchema.Enum.DRAFT,
        ...data,
        tags: {
          connectOrCreate: tags.map(
            (tag) =>
              ({
                where: getTypeName(tag),
                create: tag,
              } as const),
          ),
        },
        imageFile: null,
        bookFile: null,
        userId: user.id,
      },
      include: { tags: true },
    });
  }

  async findAllVisible(query = ''): Promise<BookEntity[]> {
    const tagSchema = z
      .preprocess(
        (e) =>
          String(e)
            .split(':')
            .map((e, i) => (i === 0 ? e.toUpperCase() : e.toLowerCase())),
        z.tuple([TagTypeSchema.or(z.literal('DESC')), z.string()]),
      )
      .transform((e) => ({ type: e[0], name: e[1] }));
    const segments = query
      .split(';')
      .map((e) => e.trim())
      .filter(Boolean);

    const conditions: z.infer<typeof BookWhereInputSchema>[] = [];
    conditions.push({
      state: BookStateSchema.Enum.VISIBLE,
    });
    for (const segment of segments) {
      if (segment.includes(':')) {
        const parsedTag = tagSchema.safeParse(segment);
        if (!parsedTag.success)
          throw new BadRequestException(parsedTag.error.format());
        const value = parsedTag.data;
        if (value.type === 'DESC') {
          for (const query of value.name.toLowerCase().split(/\P{L}+/gu)) {
            conditions.push({
              description: {
                contains: query,
                mode: 'insensitive',
              },
            });
          }
        } else {
          conditions.push({
            tags: {
              some: {
                type: value.type,
                name: {
                  equals: value.name,
                  mode: 'insensitive',
                },
              },
            },
          });
        }
      } else {
        for (const query of segment.toLowerCase().split(/\P{L}+/gu)) {
          conditions.push({
            title: {
              contains: query,
              mode: 'insensitive',
            },
          });
        }
      }
    }

    return await this.prisma.book.findMany({
      where: {
        AND: conditions,
      },
      include: {
        tags: true,
      },
    });
  }

  async findAllDrafts(user: UserEntity): Promise<BookEntity[]> {
    return await this.prisma.book.findMany({
      where: {
        userId: user.id,
        state: {
          in: [BookStateSchema.Enum.DRAFT, BookStateSchema.Enum.UNAPPROVED],
        },
      },
      include: {
        tags: true,
      },
    });
  }

  async findAllPendingApproval(): Promise<BookEntity[]> {
    return await this.prisma.book.findMany({
      where: {
        state: BookStateSchema.Enum.UNAPPROVED,
      },
      include: {
        tags: true,
      },
    });
  }

  async findAllArchived(): Promise<BookEntity[]> {
    return await this.prisma.book.findMany({
      where: {
        state: BookStateSchema.Enum.ARCHIVED,
      },
      include: {
        tags: true,
      },
    });
  }

  async findByProxy(proxy: BookProxy): Promise<BookEntity> {
    return await proxy.get();
  }

  async findCoverByProxy(
    proxy: BookProxy,
    res: Response,
  ): Promise<StreamableFile> {
    const book = await proxy.get();
    return this.filesService.getFile(book.imageFile, res, null);
  }

  async findFileByProxy(
    proxy: BookProxy,
    res: Response,
  ): Promise<StreamableFile> {
    const book = await proxy.get();
    if (!book.bookFile) throw new NotFoundException();
    return this.filesService.getFile(book.bookFile, res, book.title);
  }

  async update(
    id: string,
    updateBookDto: UpdateBookDto,
    proxy: BookProxy,
  ): Promise<BookEntity> {
    const book = await proxy.get();
    const newTags = updateBookDto.tags;
    const tagEq = (a: Omit<TagEntity, 'id'>) => (b: Omit<TagEntity, 'id'>) =>
      a.type == b.type && a.name == b.name;
    const connect = newTags?.filter((e) => !book.tags.find(tagEq(e)));
    const deleted = newTags && book.tags.filter((e) => !newTags.find(tagEq(e)));
    return this.prisma.book.update({
      where: {
        id,
      },
      data: {
        ...updateBookDto,
        tags: newTags && {
          connectOrCreate: connect?.map((e) => ({
            where: getTypeName(e),
            create: e,
          })),
          disconnect: deleted?.map((e) => getTypeName(e)),
        },
      },
      include: { tags: true },
    });
  }

  async changeCover(
    id: string,
    image: Express.Multer.File,
    proxy: BookProxy,
  ): Promise<BookEntity> {
    await proxy.get();
    const filename = await this.filesService.setFile(id, 'cover', image);
    return this.prisma.book.update({
      where: { id },
      data: {
        imageFile: filename,
      },
      include: { tags: true },
    });
  }

  async changeFile(
    id: string,
    book: Express.Multer.File,
    proxy: BookProxy,
  ): Promise<BookEntity> {
    await proxy.get();
    const filename = await this.filesService.setFile(id, 'book', book);
    return this.prisma.book.update({
      where: { id },
      data: {
        bookFile: filename,
      },
      include: { tags: true },
    });
  }

  async archive(id: string, proxy: BookProxy): Promise<BookEntity> {
    const book = await proxy.get();
    if (book.state !== BookStateSchema.Enum.VISIBLE) {
      throw new BadRequestException('Only Visible books can be archived');
    }
    return this.prisma.book.update({
      where: { id },
      data: {
        state: BookStateSchema.Enum.ARCHIVED,
      },
      include: { tags: true },
    });
  }

  async unarchive(id: string, proxy: BookProxy): Promise<BookEntity> {
    const book = await proxy.get();
    if (book.state !== BookStateSchema.Enum.ARCHIVED) {
      throw new BadRequestException('Only Archived books can be unarchived');
    }
    return this.prisma.book.update({
      where: { id },
      data: {
        state: BookStateSchema.Enum.VISIBLE,
      },
      include: { tags: true },
    });
  }

  async submit(id: string, proxy: BookProxy): Promise<BookEntity> {
    const book = await proxy.get();
    if (book.state !== BookStateSchema.Enum.DRAFT) {
      throw new BadRequestException(
        'Only Draft books can be submitted for approval',
      );
    }
    return this.prisma.book.update({
      where: { id },
      data: {
        state: BookStateSchema.Enum.UNAPPROVED,
      },
      include: { tags: true },
    });
  }

  async approve(id: string, proxy: BookProxy): Promise<BookEntity> {
    const book = await proxy.get();
    if (book.state !== BookStateSchema.Enum.UNAPPROVED) {
      throw new BadRequestException('Only Unapproved books can be approved');
    }
    return this.prisma.book.update({
      where: { id },
      data: {
        state: BookStateSchema.Enum.VISIBLE,
      },
      include: { tags: true },
    });
  }

  async reject(id: string, proxy: BookProxy): Promise<BookEntity> {
    const book = await proxy.get();
    if (book.state !== BookStateSchema.Enum.UNAPPROVED) {
      throw new BadRequestException('Only Unapproved books can be rejected');
    }
    return this.prisma.book.update({
      where: { id },
      data: {
        state: BookStateSchema.Enum.DRAFT,
      },
      include: { tags: true },
    });
  }

  async delete(id: string, proxy: BookProxy): Promise<BookEntity> {
    const book = await proxy.get();
    if (book.state !== BookStateSchema.Enum.ARCHIVED) {
      throw new BadRequestException('Only Archived books can be deleted');
    }
    const returnedBook = this.prisma.book.delete({
      where: { id },
      include: { tags: true },
    });
    await this.filesService.deleteAll(id);
    return returnedBook;
  }

  async seed(): Promise<void> {
    // if (Math.random() < 1) return;
    const schema = z.array(
      z
        .object({
          book_page: z.string(),
          title: z.string().transform((e) => e.replace('Назва: ', '')),
          author: z.string().nullable(),
          description: z.string(),
          genres: z
            .string()
            .transform((e) =>
              e
                .replace('Жанри: ', '')
                .split(',')
                .map((e) => e.trim()),
            )
            .nullable(),
          cover: z
            .string()
            .url()
            .transform((e) => new URL(e)),
          download: z
            .string()
            .url()
            .transform((e) => new URL(e))
            .nullable(),
        })
        .strip(),
    );

    const books = schema.parse(
      JSON.parse(fs.readFileSync('./csvjson.json').toString()),
    );
    await lastValueFrom(
      from(books).pipe(
        distinct((value) => value.title),
        delayWhen((_, i) => interval(i * 250)),
        // skip(100),
        map(async (book, idx) => {
          console.log('Parsing book:', book.title, `(${idx}/${books.length})`);
          const tags: Omit<TagEntity, 'id'>[] = [];
          if (book.author) {
            tags.push({
              type: 'AUTHOR',
              name: book.author,
            });
          }
          for (const genre of book.genres ?? []) {
            tags.push({
              type: 'GENRE',
              name: genre.trim(),
            });
          }

          const id = randomUUID();
          let fileName: string | null = null;
          if (book.download) {
            const file = await axios(book.download.toString(), {
              responseType: 'stream',
            });
            const [fileStream, _fileName] =
              await this.filesService.createWriteStream(
                id,
                'book',
                book.download.pathname.split('/').at(-1)!,
              );
            fileName = _fileName;
            file.data.pipe(fileStream);
          } else {
            return;
          }

          const cover = await axios(book.cover.toString(), {
            responseType: 'stream',
          });
          const [coverStream, coverName] =
            await this.filesService.createWriteStream(
              id,
              'cover',
              book.cover.pathname.split('/').at(-1)!,
            );

          cover.data.pipe(coverStream);

          await new Promise((resolve, reject) => {
            coverStream.on('finish', resolve);
            coverStream.on('error', reject);
          });

          await this.prisma.book.create({
            data: {
              id: id,
              title: book.title,
              published_date: new Date(),
              description: book.description,
              tags: {
                connectOrCreate: tags.map((e) => ({
                  where: getTypeName(e),
                  create: e,
                })),
              },
              state: 'VISIBLE',
              bookFile: fileName,
              imageFile: coverName,
              userId: null,
            },
          });
          console.log(
            'Done parsing book:',
            book.title,
            `(${idx}/${books.length})`,
          );
        }),
      ),
    );
  }

  async onApplicationBootstrap(): Promise<void> {
    console.log('creating books');
    // await this.seed();
    console.log('creating books finished');
  }
}
