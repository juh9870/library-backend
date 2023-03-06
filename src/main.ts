import '@total-typescript/ts-reset';

import { patchNestjsSwagger, ZodValidationPipe } from '@anatine/zod-nestjs';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { PrismaSessionStore } from '@quixo3/prisma-session-store';
import expressSession from 'express-session';
import { PrismaService } from 'nestjs-prisma';
import passport from 'passport';

import { AppModule } from './app.module';
import { ConfigService } from './config/config.service';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  const config = app.get(ConfigService);
  const prismaService = app.get(PrismaService);

  app.useGlobalPipes(new ZodValidationPipe());

  app.use(
    expressSession({
      cookie: {
        maxAge: config.COOKIE_MAX_AGE,
      },
      secret: config.SESSION_SECRET,
      resave: true,
      saveUninitialized: true,
      store: new PrismaSessionStore(prismaService, {
        checkPeriod: config.SESSION_CHECK_PERIOD,
        dbRecordIdIsSessionId: true,
        dbRecordIdFunction: undefined,
      }),
    }),
    passport.session(),
  );

  const swaggerConfig = new DocumentBuilder()
    .setTitle('$$NAME$$ backend API')
    .setVersion('1.0.0')
    .build();
  patchNestjsSwagger();
  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('api', app, document);

  await app.listen(config.PORT);
}

void bootstrap();
