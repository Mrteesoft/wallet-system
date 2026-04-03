import { Injectable } from '@nestjs/common';
import { Prisma, Wallet } from '@prisma/client';

import {
  BaseEntityRepository,
  EntityNotFoundError,
  InsufficientBalanceError,
  PrismaService,
} from '../../../../packages/common/src';

type CreateWalletData = {
  userId: string;
};

@Injectable()
export class WalletRepository extends BaseEntityRepository<Wallet, CreateWalletData> {
  protected readonly entityName = 'Wallet';

  constructor(prisma: PrismaService) {
    super(prisma);
  }

  override findById(id: string): Promise<Wallet | null> {
    return this.prisma.wallet.findUnique({
      where: { id },
    });
  }

  findByUserId(userId: string): Promise<Wallet | null> {
    return this.prisma.wallet.findUnique({
      where: { userId },
    });
  }

  override create(data: CreateWalletData): Promise<Wallet> {
    return this.prisma.wallet.create({
      data,
    });
  }

  creditByUserId(userId: string, amount: Prisma.Decimal.Value): Promise<Wallet> {
    return this.prisma.wallet.update({
      where: { userId },
      data: {
        balance: {
          increment: this.toDecimal(amount),
        },
      },
    });
  }

  debitByUserId(userId: string, amount: Prisma.Decimal.Value): Promise<Wallet> {
    const decimalAmount = this.toDecimal(amount);

    // Run the balance check and decrement inside one transaction so debits
    // cannot succeed based on a stale pre-check result.
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
