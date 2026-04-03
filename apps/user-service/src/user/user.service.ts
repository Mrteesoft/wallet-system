import { status } from '@grpc/grpc-js';
import { Injectable } from '@nestjs/common';
import { User } from '@prisma/client';

import { BaseEntityGrpcService } from '../../../../packages/common/src/base/base.entity-grpc.service';

import { CreateUserRequestDto } from './dto/create-user-request.dto';
import { GetUserByIdRequestDto } from './dto/get-user-by-id-request.dto';
import { UserResponse } from './interfaces/user-response.interface';
import { WalletGrpcClient } from './wallet-grpc.client';
import { UserRepository } from './user.repository';

@Injectable()
export class UserService extends BaseEntityGrpcService<User, UserResponse> {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly walletGrpcClient: WalletGrpcClient,
  ) {
    super();
  }

  async createUser(payload: CreateUserRequestDto): Promise<UserResponse> {
    const existingUser = await this.userRepository.findByEmail(payload.email);

    if (existingUser) {
      this.alreadyExists(`User with email ${payload.email} already exists`);
    }

    const user = await this.userRepository.create({
      email: payload.email,
      name: payload.name,
    });

    try {
      await this.walletGrpcClient.createWallet({ userId: user.id });

      return this.toResponse(user);
    } catch (error) {
      await this.rollbackUserCreation(user.id);
      this.handleWalletProvisioningFailure(error);
    }
  }

  async getUserById(payload: GetUserByIdRequestDto): Promise<UserResponse> {
    return this.toRequiredResponse(
      await this.userRepository.findById(payload.id),
      `User ${payload.id} not found`,
    );
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
    } catch {
      // Best-effort compensation for assessment purposes.
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
