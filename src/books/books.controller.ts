import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseFilePipeBuilder,
  Patch,
  Post,
  Query,
  Res,
  StreamableFile,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import type { Response } from 'express';
import { AccessGuard, CaslSubject, UseAbility } from 'nest-casl';

import { BookStateSchema } from '../../prisma/generated/zod';
import { AuthUser } from '../auth/decorators/auth-user.decorator';
import { Public } from '../auth/decorators/public.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { FileUploadDto } from '../files/dto/file-upload.dto';
import { UserEntity } from '../users/entity/user.entity';
import { book, bookId } from './books.hook';
import { BookActions } from './books.permissions';
import { BookProxy, BooksService } from './books.service';
import { CreateBookDto } from './dto/create-book.dto';
import { UpdateBookDto } from './dto/update-book.dto';
import { BookEntity } from './entities/book.entity';

@Controller('books')
@ApiTags('books')
export class BooksController {
  constructor(private readonly bookService: BooksService) {}

  @Get()
  @ApiOkResponse({ type: BookEntity, isArray: true })
  @ApiQuery({
    name: 'tags',
    type: String,
    required: false,
  })
  findAllVisible(@Query('tags') tagsQuery?: string): Promise<BookEntity[]> {
    return this.bookService.findAllVisible(tagsQuery);
  }

  @Get('/drafts')
  @ApiOkResponse({ type: BookEntity, isArray: true })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, AccessGuard)
  @UseAbility(
    BookActions.read,
    BookEntity,
    book((user) => ({
      state: BookStateSchema.Enum.DRAFT,
      userId: user.id,
    })),
  )
  findAllDrafts(@AuthUser() user: UserEntity): Promise<BookEntity[]> {
    return this.bookService.findAllDrafts(user);
  }

  @Get('/pending')
  @ApiOkResponse({ type: BookEntity, isArray: true })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, AccessGuard)
  @UseAbility(
    BookActions.read,
    BookEntity,
    book({ state: BookStateSchema.Enum.UNAPPROVED }),
  )
  findAllPendingApproval(): Promise<BookEntity[]> {
    return this.bookService.findAllPendingApproval();
  }

  @Get('/archived')
  @ApiOkResponse({ type: BookEntity, isArray: true })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, AccessGuard)
  @UseAbility(
    BookActions.read,
    BookEntity,
    book({ state: BookStateSchema.Enum.ARCHIVED }),
  )
  findAllArchived(): Promise<BookEntity[]> {
    return this.bookService.findAllArchived();
  }

  @Post()
  @ApiOperation({ description: 'Creates a book' })
  @ApiCreatedResponse({ type: BookEntity })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, AccessGuard)
  @UseAbility(BookActions.create, BookEntity)
  create(
    @Body() createBookDto: CreateBookDto,
    @AuthUser() user: UserEntity,
  ): Promise<BookEntity> {
    return this.bookService.create(createBookDto, user);
  }

  @Get(':id')
  @ApiOkResponse({ type: BookEntity })
  @ApiBearerAuth()
  @Public()
  @UseGuards(JwtAuthGuard, AccessGuard)
  @UseAbility(BookActions.read, BookEntity, bookId())
  findOne(
    @Param('id') _id: string,
    @CaslSubject() subjectProxy: BookProxy,
  ): Promise<BookEntity> {
    return this.bookService.findByProxy(subjectProxy);
  }

  @Get(':id/cover')
  @ApiOkResponse({
    schema: {
      description: 'book cover',
      type: 'string',
      format: 'binary',
    },
  })
  @ApiBearerAuth()
  @Public()
  @UseGuards(JwtAuthGuard, AccessGuard)
  @UseAbility(BookActions.read, BookEntity, bookId())
  findCover(
    @Param('id') _id: string,
    @CaslSubject() subjectProxy: BookProxy,
    @Res({ passthrough: true }) res: Response,
  ): Promise<StreamableFile> {
    return this.bookService.findCoverByProxy(subjectProxy, res);
  }

  @Get(':id/file')
  @ApiOkResponse({
    schema: {
      description: 'book file',
      type: 'string',
      format: 'binary',
    },
  })
  @ApiBearerAuth()
  @Public()
  @UseGuards(JwtAuthGuard, AccessGuard)
  @UseAbility(BookActions.read, BookEntity, bookId())
  findFile(
    @Param('id') _id: string,
    @CaslSubject() subjectProxy: BookProxy,
    @Res({ passthrough: true }) res: Response,
  ): Promise<StreamableFile> {
    return this.bookService.findFileByProxy(subjectProxy, res);
  }

  @Patch(':id')
  @ApiOkResponse({ type: BookEntity })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, AccessGuard)
  @UseAbility(BookActions.update, BookEntity, bookId())
  update(
    @Param('id') id: string,
    @Body() updateBookDto: UpdateBookDto,
    @CaslSubject() subjectProxy: BookProxy,
  ): Promise<BookEntity> {
    return this.bookService.update(id, updateBookDto, subjectProxy);
  }

  @Post(':id/cover')
  @ApiOperation({ description: 'Updates book cover' })
  @ApiOkResponse({ type: BookEntity })
  @ApiBearerAuth()
  @ApiConsumes('multipart/form-data')
  @ApiBody({ type: FileUploadDto })
  @UseInterceptors(FileInterceptor('file'))
  @UseGuards(JwtAuthGuard, AccessGuard)
  @UseAbility(BookActions.update, BookEntity, bookId())
  setCover(
    @Param('id') id: string,
    @UploadedFile(
      new ParseFilePipeBuilder()
        // .addFileTypeValidator({ fileType: /png|jpeg|jpg/ })
        .build(),
    )
    file: Express.Multer.File,
    @CaslSubject() subjectProxy: BookProxy,
  ): Promise<BookEntity> {
    return this.bookService.changeCover(id, file, subjectProxy);
  }

  @Post(':id/file')
  @ApiOperation({ description: 'Updates book file' })
  @ApiOkResponse({ type: BookEntity })
  @ApiBearerAuth()
  @ApiConsumes('multipart/form-data')
  @ApiBody({ type: FileUploadDto })
  @UseInterceptors(FileInterceptor('file'))
  @UseGuards(JwtAuthGuard, AccessGuard)
  @UseAbility(BookActions.update, BookEntity, bookId())
  setFile(
    @Param('id') id: string,
    @UploadedFile() file: Express.Multer.File,
    @CaslSubject() subjectProxy: BookProxy,
  ): Promise<BookEntity> {
    return this.bookService.changeFile(id, file, subjectProxy);
  }

  @Post(':id/submit')
  @ApiOperation({ description: 'Submits a book for approval' })
  @ApiCreatedResponse({ type: BookEntity })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, AccessGuard)
  @UseAbility(BookActions.create, BookEntity, bookId())
  submit(
    @Param('id') id: string,
    @CaslSubject() subjectProxy: BookProxy,
  ): Promise<BookEntity> {
    return this.bookService.submit(id, subjectProxy);
  }

  @Post(':id/approve')
  @ApiOperation({ description: 'Approves a book' })
  @ApiCreatedResponse({ type: BookEntity })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, AccessGuard)
  @UseAbility(BookActions.approve, BookEntity, bookId())
  approve(
    @Param('id') id: string,
    @CaslSubject() subjectProxy: BookProxy,
  ): Promise<BookEntity> {
    return this.bookService.approve(id, subjectProxy);
  }

  @Post(':id/reject')
  @ApiOperation({ description: 'Rejects an approval submission' })
  @ApiCreatedResponse({ type: BookEntity })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, AccessGuard)
  @UseAbility(BookActions.approve, BookEntity, bookId())
  reject(
    @Param('id') id: string,
    @CaslSubject() subjectProxy: BookProxy,
  ): Promise<BookEntity> {
    return this.bookService.reject(id, subjectProxy);
  }

  @Post(':id/archive')
  @ApiOperation({ description: 'Archives a book' })
  @ApiCreatedResponse({ type: BookEntity })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, AccessGuard)
  @UseAbility(BookActions.archive, BookEntity, bookId())
  archive(
    @Param('id') id: string,
    @CaslSubject() subjectProxy: BookProxy,
  ): Promise<BookEntity> {
    return this.bookService.archive(id, subjectProxy);
  }

  @Post(':id/unarchive')
  @ApiOperation({ description: 'Restores an archived book' })
  @ApiCreatedResponse({ type: BookEntity })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, AccessGuard)
  @UseAbility(BookActions.unarchive, BookEntity, bookId())
  unarchive(
    @Param('id') id: string,
    @CaslSubject() subjectProxy: BookProxy,
  ): Promise<BookEntity> {
    return this.bookService.unarchive(id, subjectProxy);
  }

  @Delete(':id')
  @ApiOperation({ description: 'Deletes an archived book' })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, AccessGuard)
  @UseAbility(BookActions.delete, BookEntity, bookId())
  delete(
    @Param('id') id: string,
    @CaslSubject() subjectProxy: BookProxy,
  ): Promise<BookEntity> {
    return this.bookService.delete(id, subjectProxy);
  }
}
