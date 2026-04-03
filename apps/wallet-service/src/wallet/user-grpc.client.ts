import { Inject, Injectable, OnModuleInit } from '@nestjs/common';
import { ClientGrpc } from '@nestjs/microservices';
import { lastValueFrom } from 'rxjs';

import {
  createGrpcMetadataFromContext,
  USER_GRPC_CLIENT,
  USER_SERVICE_NAME,
} from '../../../../packages/common/src';

import { UserGrpcResponse, UserServiceGrpc } from './interfaces/user-grpc.interface';

@Injectable()
export class UserGrpcClient implements OnModuleInit {
  private userService!: UserServiceGrpc;

  constructor(@Inject(USER_GRPC_CLIENT) private readonly client: ClientGrpc) {}

  onModuleInit(): void {
    this.userService = this.client.getService<UserServiceGrpc>(USER_SERVICE_NAME);
  }

  getUserById(userId: string): Promise<UserGrpcResponse> {
    return lastValueFrom(
      this.userService.getUserById(
        { id: userId },
        createGrpcMetadataFromContext(),
      ),
    );
  }
}
