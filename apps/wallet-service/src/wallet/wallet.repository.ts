import { Injectable } from '@nestjs/common';
import { Wallet } from '@prisma/client';

import { BaseEntityRepository } from '../../../../packages/common/src/base/base.entity.repository';
import {
  EntityNotFoundError,
  InsufficientBalanceError,
} from '../../../../packages/common/src/errors/domain.errors';
import { PrismaService } from '../../../../packages/common/src/prisma/prisma.service';

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

  async findByUserIdOrThrow(userId: string): Promise<Wallet> {
    return this.ensureEntity(
      await this.findByUserId(userId),
      `Wallet for user ${userId} not found`,
    );
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
