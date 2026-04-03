import 'dotenv/config';
import 'reflect-metadata';

import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';

import {
  USER_PROTO_PACKAGE,
  getGrpcListenUrl,
  getProtoPath,
} from '../../../packages/common/src/grpc/grpc.constants';

import { AppModule } from './app.module';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.createMicroservice<MicroserviceOptions>(
    AppModule,
    {
      transport: Transport.GRPC,
      options: {
        package: USER_PROTO_PACKAGE,
        protoPath: getProtoPath('user.proto'),
        url: getGrpcListenUrl(
          'USER_SERVICE_GRPC_HOST',
          'USER_SERVICE_GRPC_PORT',
          '0.0.0.0',
          50051,
        ),
      },
    },
  );

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );

  await app.listen();
}

void bootstrap();
