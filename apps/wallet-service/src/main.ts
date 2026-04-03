import 'dotenv/config';
import 'reflect-metadata';

import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import { Logger } from 'nestjs-pino';

import {
  WALLET_PROTO_PACKAGE,
  getGrpcListenUrl,
  getProtoPath,
} from '../../../packages/common/src';

import { AppModule } from './app.module';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.createMicroservice<MicroserviceOptions>(
    AppModule,
    {
      bufferLogs: true,
      transport: Transport.GRPC,
      options: {
        package: WALLET_PROTO_PACKAGE,
        protoPath: getProtoPath('wallet.proto'),
        url: getGrpcListenUrl(
          'WALLET_SERVICE_GRPC_HOST',
          'WALLET_SERVICE_GRPC_PORT',
          '0.0.0.0',
          50052,
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
  app.useLogger(app.get(Logger));
  app.flushLogs();

  await app.listen();
}

void bootstrap();
