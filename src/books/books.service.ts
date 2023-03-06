import {
  BadRequestException,
  Injectable,
  NotFoundException,
  StreamableFile,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import type { Response } from 'express';
import { PrismaService } from 'nestjs-prisma';

import { BookStateSchema } from '../../prisma/generated/zod';
import { FilesService } from '../files/files.service';
import type { UserEntity } from '../users/entity/user.entity';
import type { CreateBookDto } from './dto/create-book.dto';
import type { UpdateBookDto } from './dto/update-book.dto';
import type { BookEntity } from './entities/book.entity';

export interface BookProxy {
  get(): Promise<BookEntity>;
}

@Injectable()
export class BooksService {
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
                where: {
                  type_name: tag,
                },
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

  async findAllVisible(): Promise<BookEntity[]> {
    return await this.prisma.book.findMany({
      where: {
        state: BookStateSchema.Enum.VISIBLE,
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
        state: BookStateSchema.Enum.DRAFT,
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
    if (!book.imageFile) throw new NotFoundException();
    return this.filesService.getFile(book.id, book.imageFile, res, null);
  }

  async findFileByProxy(
    proxy: BookProxy,
    res: Response,
  ): Promise<StreamableFile> {
    const book = await proxy.get();
    if (!book.bookFile) throw new NotFoundException();
    return this.filesService.getFile(book.id, book.bookFile, res, book.title);
  }

  async update(
    id: string,
    updateBookDto: UpdateBookDto,
    proxy: BookProxy,
  ): Promise<BookEntity> {
    await proxy.get();
    const newTags = updateBookDto.tags;
    return this.prisma.book.update({
      where: {
        id,
      },
      data: {
        ...updateBookDto,
        tags: newTags && {
          set: newTags.map((tag) => ({
            type_name: tag,
          })),
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

  async approve(id: string, proxy: BookProxy): Promise<BookEntity> {
    const book = await proxy.get();
    if (book.state !== BookStateSchema.Enum.DRAFT) {
      throw new BadRequestException('Only Draft books can be approved');
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
}
