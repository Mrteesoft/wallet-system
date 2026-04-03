import { Module } from '@nestjs/common';
import { APP_FILTER, APP_INTERCEPTOR } from '@nestjs/core';

import {
  GrpcExceptionFilter,
  PrismaModule,
  RpcLoggingInterceptor,
  createLoggingModule,
} from '../../../packages/common/src';

import { UserModule } from './user/user.module';

@Module({
  imports: [createLoggingModule('user-service'), PrismaModule, UserModule],
  providers: [
    {
      provide: APP_INTERCEPTOR,
      useClass: RpcLoggingInterceptor,
    },
    {
      provide: APP_FILTER,
      useClass: GrpcExceptionFilter,
    },
  ],
})
export class AppModule {}
