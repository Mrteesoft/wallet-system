import { Injectable } from '@nestjs/common';
import { Wallet } from '@prisma/client';

import { BaseRepository } from '../../../../packages/common/src/base/base.repository';
import {
  EntityNotFoundError,
  InsufficientBalanceError,
} from '../../../../packages/common/src/errors/domain.errors';
import { PrismaService } from '../../../../packages/common/src/prisma/prisma.service';

@Injectable()
export class WalletRepository extends BaseRepository {
  constructor(prisma: PrismaService) {
    super(prisma);
  }

  findByUserId(userId: string): Promise<Wallet | null> {
    return this.prisma.wallet.findUnique({
      where: { userId },
    });
  }

  createForUser(userId: string): Promise<Wallet> {
    return this.prisma.wallet.create({
      data: { userId },
    });
  }

  creditByUserId(userId: string, amount: number): Promise<Wallet> {
    return this.prisma.wallet.update({
      where: { userId },
      data: {
        balance: {
          increment: this.toDecimal(amount),
        },
      },
    });
  }

  debitByUserId(userId: string, amount: number): Promise<Wallet> {
    const decimalAmount = this.toDecimal(amount);

    return this.prisma.$transaction(async (transaction) => {
      const wallet = await transaction.wallet.findUnique({
        where: { userId },
      });

      if (!wallet) {
        throw new EntityNotFoundError(`Wallet for user ${userId} not found`);
      }

      if (wallet.balance.lt(decimalAmount)) {
        throw new InsufficientBalanceError(
          `Wallet for user ${userId} has insufficient balance`,
        );
      }

      return transaction.wallet.update({
        where: { userId },
        data: {
          balance: {
            decrement: decimalAmount,
          },
        },
      });
    });
  }
}
