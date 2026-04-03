import { Module } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';

import {
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
  ],
})
export class AppModule {}
