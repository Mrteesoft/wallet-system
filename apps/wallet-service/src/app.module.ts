import { Module } from '@nestjs/common';

import { PrismaModule } from '../../../packages/common/src/prisma/prisma.module';

import { WalletModule } from './wallet/wallet.module';

@Module({
  imports: [PrismaModule, WalletModule],
})
export class AppModule {}
