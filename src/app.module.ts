import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { MulterModule } from '@nestjs/platform-express';
import { CaslModule } from 'nest-casl';
import type { AuthorizableUser } from 'nest-casl/dist/interfaces/authorizable-user.interface';
import { PrismaModule } from 'nestjs-prisma';

import type { PermissionType } from '../prisma/generated/zod';
import { PermissionSchema } from '../prisma/generated/zod';
import { AuthModule } from './auth/auth.module';
import { BooksModule } from './books/books.module';
import { ConfigModule } from './config/config.module';
import { FilesModule } from './files/files.module';
import type { UserEntity } from './users/entity/user.entity';
import { UsersModule } from './users/users.module';

@Module({
  imports: [
    ConfigModule,
    PrismaModule.forRoot({
      isGlobal: true,
      prismaServiceOptions: {
        prismaOptions: {
          // log: ['query', 'info', 'warn', 'error'],
        },
      },
    }),
    CaslModule.forRoot<PermissionType, AuthorizableUser, { user?: UserEntity }>(
      {
        superuserRole: PermissionSchema.Enum.ADMIN,
        getUserFromRequest: (req) =>
          req.user
            ? {
                id: req.user.id,
                roles: req.user.permissions,
              }
            : {
                id: 'unauthenticated',
                roles: [],
              },
      },
    ),
    MulterModule.register({
      dest: './upload',
    }),
    AuthModule,
    UsersModule,
    PassportModule.register({
      session: true,
    }),
    BooksModule,
    FilesModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
