import { status } from '@grpc/grpc-js';
import { Injectable } from '@nestjs/common';
import { Wallet } from '@prisma/client';
import { PinoLogger } from 'nestjs-pino';

import { BaseEntityGrpcService } from '../../../../packages/common/src/base/base.entity-grpc.service';
import {
  EntityNotFoundError,
  InsufficientBalanceError,
} from '../../../../packages/common/src/errors/domain.errors';

import { CreateWalletRequestDto } from './dto/create-wallet-request.dto';
import { GetWalletRequestDto } from './dto/get-wallet-request.dto';
import { UpdateWalletBalanceRequestDto } from './dto/update-wallet-balance-request.dto';
import { WalletResponse } from './interfaces/wallet-response.interface';
import { UserGrpcClient } from './user-grpc.client';
import { WalletRepository } from './wallet.repository';

@Injectable()
export class WalletService extends BaseEntityGrpcService<Wallet, WalletResponse> {
  constructor(
    logger: PinoLogger,
    private readonly walletRepository: WalletRepository,
    private readonly userGrpcClient: UserGrpcClient,
  ) {
    super(logger, WalletService.name);
  }

  async createWallet(payload: CreateWalletRequestDto): Promise<WalletResponse> {
    this.logActionStarted('create_wallet', {
      userId: payload.userId,
    });

    const existingWallet = await this.walletRepository.findByUserId(payload.userId);

    if (existingWallet) {
      this.logActionWarn('create_wallet_duplicate', {
        userId: payload.userId,
      });
      this.alreadyExists(`Wallet for user ${payload.userId} already exists`);
    }

    await this.ensureUserExists(payload.userId);

    const wallet = await this.walletRepository.create({
      userId: payload.userId,
    });

    this.logActionSucceeded('create_wallet', {
      walletId: wallet.id,
      userId: wallet.userId,
      balance: Number(wallet.balance),
    });

    return this.toResponse(wallet);
  }

  async getWallet(payload: GetWalletRequestDto): Promise<WalletResponse> {
    const wallet = await this.walletRepository.findByUserId(payload.userId);
    const response = this.toRequiredResponse(
      wallet,
      `Wallet for user ${payload.userId} not found`,
    );

    this.logActionSucceeded('get_wallet', {
      userId: payload.userId,
      walletId: response.id,
      balance: response.balance,
    });

    return response;
  }

  async creditWallet(
    payload: UpdateWalletBalanceRequestDto,
  ): Promise<WalletResponse> {
    this.logActionStarted('credit_wallet', {
      userId: payload.userId,
      amount: payload.amount,
    });

    this.ensurePositiveAmount(payload.amount);

    try {
      await this.walletRepository.findByUserIdOrThrow(payload.userId);

      const updatedWallet = await this.walletRepository.creditByUserId(
        payload.userId,
        payload.amount,
      );

      this.logActionSucceeded('credit_wallet', {
        userId: payload.userId,
        amount: payload.amount,
        balance: Number(updatedWallet.balance),
      });

      return this.toResponse(updatedWallet);
    } catch (error) {
      if (error instanceof EntityNotFoundError) {
        this.logActionWarn('credit_wallet_wallet_not_found', {
          userId: payload.userId,
          amount: payload.amount,
        });
        this.notFound(error.message);
      }

      this.logActionFailed('credit_wallet', error, {
        userId: payload.userId,
        amount: payload.amount,
      });
      throw error;
    }
  }

  async debitWallet(
    payload: UpdateWalletBalanceRequestDto,
  ): Promise<WalletResponse> {
    this.logActionStarted('debit_wallet', {
      userId: payload.userId,
      amount: payload.amount,
    });

    this.ensurePositiveAmount(payload.amount);

    try {
      const updatedWallet = await this.walletRepository.debitByUserId(
        payload.userId,
        payload.amount,
      );

      this.logActionSucceeded('debit_wallet', {
        userId: payload.userId,
        amount: payload.amount,
        balance: Number(updatedWallet.balance),
      });

      return this.toResponse(updatedWallet);
    } catch (error) {
      if (error instanceof EntityNotFoundError) {
        this.logActionWarn('debit_wallet_wallet_not_found', {
          userId: payload.userId,
          amount: payload.amount,
        });
        this.notFound(error.message);
      }

      if (error instanceof InsufficientBalanceError) {
        this.logActionWarn('debit_wallet_insufficient_balance', {
          userId: payload.userId,
          amount: payload.amount,
        });
        this.failedPrecondition(error.message);
      }

      this.logActionFailed('debit_wallet', error, {
        userId: payload.userId,
        amount: payload.amount,
      });
      throw error;
    }
  }

  private async ensureUserExists(userId: string): Promise<void> {
    try {
      await this.userGrpcClient.getUserById(userId);
      this.logActionSucceeded('verify_wallet_user_exists', {
        userId,
      });
    } catch (error) {
      const errorCode =
        typeof error === 'object' && error !== null && 'code' in error
          ? Number((error as { code?: number }).code)
          : undefined;

      if (errorCode === status.NOT_FOUND) {
        this.logActionWarn('verify_wallet_user_missing', {
          userId,
        });
        this.notFound(`User ${userId} not found`);
      }

      this.logActionFailed('verify_wallet_user_exists', error, {
        userId,
      });
      this.unavailable('User service is unavailable');
    }
  }

  protected override toResponse(wallet: Wallet): WalletResponse {
    return {
      id: wallet.id,
      userId: wallet.userId,
      balance: Number(wallet.balance),
      createdAt: wallet.createdAt.toISOString(),
    };
  }
}
