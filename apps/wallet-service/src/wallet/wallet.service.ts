import { status } from '@grpc/grpc-js';
import { Injectable } from '@nestjs/common';
import { Wallet } from '@prisma/client';

import { BaseGrpcService } from '../../../../packages/common/src/base/base.grpc.service';
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
export class WalletService extends BaseGrpcService {
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

    const wallet = await this.walletRepository.createForUser(payload.userId);

    return this.toWalletResponse(wallet);
  }

  async getWallet(payload: GetWalletRequestDto): Promise<WalletResponse> {
    const wallet = await this.walletRepository.findByUserId(payload.userId);

    return this.toWalletResponse(
      this.ensureFound(wallet, `Wallet for user ${payload.userId} not found`),
    );
  }

  async creditWallet(
    payload: UpdateWalletBalanceRequestDto,
  ): Promise<WalletResponse> {
    this.ensurePositiveAmount(payload.amount);

    const wallet = await this.walletRepository.findByUserId(payload.userId);
    this.ensureFound(wallet, `Wallet for user ${payload.userId} not found`);

    const updatedWallet = await this.walletRepository.creditByUserId(
      payload.userId,
      payload.amount,
    );

    return this.toWalletResponse(updatedWallet);
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

      return this.toWalletResponse(updatedWallet);
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

  private toWalletResponse(wallet: Wallet): WalletResponse {
    return {
      id: wallet.id,
      userId: wallet.userId,
      balance: Number(wallet.balance),
      createdAt: wallet.createdAt.toISOString(),
    };
  }
}
