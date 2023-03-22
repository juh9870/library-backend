import '@total-typescript/ts-reset';

import { patchNestjsSwagger, ZodValidationPipe } from '@anatine/zod-nestjs';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

import { AppModule } from './app.module';
import { ConfigService } from './config/config.service';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    cors: true,
  });

  const config = app.get(ConfigService);

  app.useGlobalPipes(new ZodValidationPipe());

  const swaggerConfig = new DocumentBuilder()
    .setTitle('$$NAME$$ backend API')
    .setVersion('1.0.0')
    .addBearerAuth()
    .build();
  patchNestjsSwagger();
  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('api', app, document);

  await app.listen(config.PORT);
}

void bootstrap();
