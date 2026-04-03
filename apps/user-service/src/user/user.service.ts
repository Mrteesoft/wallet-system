import { Injectable } from '@nestjs/common';
import { User } from '@prisma/client';

import { BaseGrpcService } from '../../../../packages/common/src/base/base.grpc.service';

import { CreateUserRequestDto } from './dto/create-user-request.dto';
import { GetUserByIdRequestDto } from './dto/get-user-by-id-request.dto';
import { UserResponse } from './interfaces/user-response.interface';
import { UserRepository } from './user.repository';

@Injectable()
export class UserService extends BaseGrpcService {
  constructor(private readonly userRepository: UserRepository) {
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

    return this.toUserResponse(user);
  }

  async getUserById(payload: GetUserByIdRequestDto): Promise<UserResponse> {
    const user = await this.userRepository.findById(payload.id);

    return this.toUserResponse(
      this.ensureFound(user, `User ${payload.id} not found`),
    );
  }

  private toUserResponse(user: User): UserResponse {
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      createdAt: user.createdAt.toISOString(),
    };
  }
}
