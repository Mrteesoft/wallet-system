import { status } from '@grpc/grpc-js';
import { Injectable } from '@nestjs/common';
import { Wallet } from '@prisma/client';

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
    private readonly walletRepository: WalletRepository,
    private readonly userGrpcClient: UserGrpcClient,
  ) {
    super();
  }

  async createWallet(payload: CreateWalletRequestDto): Promise<WalletResponse> {
    const existingWallet = await this.walletRepository.findByUserId(payload.userId);

    if (existingWallet) {
      this.alreadyExists(`Wallet for user ${payload.userId} already exists`);
    }

    await this.ensureUserExists(payload.userId);

    const wallet = await this.walletRepository.create({
      userId: payload.userId,
    });

    return this.toResponse(wallet);
  }

  async getWallet(payload: GetWalletRequestDto): Promise<WalletResponse> {
    return this.toRequiredResponse(
      await this.walletRepository.findByUserId(payload.userId),
      `Wallet for user ${payload.userId} not found`,
    );
  }

  async creditWallet(
    payload: UpdateWalletBalanceRequestDto,
  ): Promise<WalletResponse> {
    this.ensurePositiveAmount(payload.amount);

    try {
      await this.walletRepository.findByUserIdOrThrow(payload.userId);

      const updatedWallet = await this.walletRepository.creditByUserId(
        payload.userId,
        payload.amount,
      );

      return this.toResponse(updatedWallet);
    } catch (error) {
      if (error instanceof EntityNotFoundError) {
        this.notFound(error.message);
      }

      throw error;
    }
  }

  async debitWallet(
    payload: UpdateWalletBalanceRequestDto,
  ): Promise<WalletResponse> {
    this.ensurePositiveAmount(payload.amount);

    try {
      const updatedWallet = await this.walletRepository.debitByUserId(
        payload.userId,
        payload.amount,
      );

      return this.toResponse(updatedWallet);
    } catch (error) {
      if (error instanceof EntityNotFoundError) {
        this.notFound(error.message);
      }

      if (error instanceof InsufficientBalanceError) {
        this.failedPrecondition(error.message);
      }

      throw error;
    }
  }

  private async ensureUserExists(userId: string): Promise<void> {
    try {
      await this.userGrpcClient.getUserById(userId);
    } catch (error) {
      const errorCode =
        typeof error === 'object' && error !== null && 'code' in error
          ? Number((error as { code?: number }).code)
          : undefined;

      if (errorCode === status.NOT_FOUND) {
        this.notFound(`User ${userId} not found`);
      }

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
