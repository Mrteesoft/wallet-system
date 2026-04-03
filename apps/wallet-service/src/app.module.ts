import { Module } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';

import {
  PrismaModule,
  RpcLoggingInterceptor,
  createLoggingModule,
} from '../../../packages/common/src';

import { WalletModule } from './wallet/wallet.module';

@Module({
  imports: [createLoggingModule('wallet-service'), PrismaModule, WalletModule],
  providers: [
    {
      provide: APP_INTERCEPTOR,
      useClass: RpcLoggingInterceptor,
    },
  ],
})
export class AppModule {}
