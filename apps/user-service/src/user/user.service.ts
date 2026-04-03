import { status } from '@grpc/grpc-js';
import { Injectable } from '@nestjs/common';
import { User } from '@prisma/client';
import { PinoLogger } from 'nestjs-pino';

import { BaseEntityGrpcService } from '../../../../packages/common/src/base/base.entity-grpc.service';

import { CreateUserRequestDto } from './dto/create-user-request.dto';
import { GetUserByIdRequestDto } from './dto/get-user-by-id-request.dto';
import { UserResponse } from './interfaces/user-response.interface';
import { WalletGrpcClient } from './wallet-grpc.client';
import { UserRepository } from './user.repository';

@Injectable()
export class UserService extends BaseEntityGrpcService<User, UserResponse> {
  constructor(
    logger: PinoLogger,
    private readonly userRepository: UserRepository,
    private readonly walletGrpcClient: WalletGrpcClient,
  ) {
    super(logger, UserService.name);
  }

  async createUser(payload: CreateUserRequestDto): Promise<UserResponse> {
    this.logActionStarted('create_user', {
      email: payload.email,
      name: payload.name,
    });

    const existingUser = await this.userRepository.findByEmail(payload.email);

    if (existingUser) {
      this.logActionWarn('create_user_duplicate_email', {
        email: payload.email,
      });
      this.alreadyExists(`User with email ${payload.email} already exists`);
    }

    const user = await this.userRepository.create({
      email: payload.email,
      name: payload.name,
    });

    try {
      await this.walletGrpcClient.createWallet({ userId: user.id });

      this.logActionSucceeded('create_user', {
        userId: user.id,
        email: user.email,
        walletProvisioned: true,
      });

      return this.toResponse(user);
    } catch (error) {
      await this.rollbackUserCreation(user.id);
      this.logActionFailed('create_user', error, {
        userId: user.id,
        email: user.email,
        walletProvisioned: false,
        rollbackAttempted: true,
      });
      this.handleWalletProvisioningFailure(error);
    }
  }

  async getUserById(payload: GetUserByIdRequestDto): Promise<UserResponse> {
    const user = await this.userRepository.findById(payload.id);
    const response = this.toRequiredResponse(
      user,
      `User ${payload.id} not found`,
    );

    this.logActionSucceeded('get_user_by_id', {
      userId: payload.id,
    });

    return response;
  }

  protected override toResponse(user: User): UserResponse {
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      createdAt: user.createdAt.toISOString(),
    };
  }

  private async rollbackUserCreation(userId: string): Promise<void> {
    try {
      await this.userRepository.deleteById(userId);
      this.logActionWarn('create_user_rollback_succeeded', {
        userId,
      });
    } catch {
      this.logActionFailed('create_user_rollback_failed', 'delete_user_failed', {
        userId,
      });
    }
  }

  private handleWalletProvisioningFailure(error: unknown): never {
    const errorCode =
      typeof error === 'object' && error !== null && 'code' in error
        ? Number((error as { code?: number }).code)
        : undefined;

    if (errorCode === status.UNAVAILABLE) {
      this.unavailable(
        'Wallet service is unavailable; user creation was rolled back',
      );
    }

    if (errorCode === status.ALREADY_EXISTS) {
      this.failedPrecondition(
        'Wallet already exists for the new user; user creation was rolled back',
      );
    }

    this.failedPrecondition('Wallet provisioning failed; user creation was rolled back');
  }
}
