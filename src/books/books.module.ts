import { Module } from '@nestjs/common';
import { CaslModule } from 'nest-casl';

import { FilesModule } from '../files/files.module';
import { BooksController } from './books.controller';
import { BooksPermissions } from './books.permissions';
import { BooksService } from './books.service';

@Module({
  imports: [
    FilesModule,
    CaslModule.forFeature({ permissions: BooksPermissions }),
  ],
  controllers: [BooksController],
  providers: [BooksService],
})
export class BooksModule {}
