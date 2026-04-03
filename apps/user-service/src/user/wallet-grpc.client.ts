import { Inject, Injectable, OnModuleInit } from '@nestjs/common';
import { ClientGrpc } from '@nestjs/microservices';
import { lastValueFrom } from 'rxjs';

import {
  createGrpcMetadataFromContext,
  WALLET_GRPC_CLIENT,
  WALLET_SERVICE_NAME,
} from '../../../../packages/common/src';

import {
  CreateWalletGrpcRequest,
  WalletGrpcResponse,
  WalletServiceGrpc,
} from './interfaces/wallet-grpc.interface';

@Injectable()
export class WalletGrpcClient implements OnModuleInit {
  private walletService!: WalletServiceGrpc;

  constructor(@Inject(WALLET_GRPC_CLIENT) private readonly client: ClientGrpc) {}

  onModuleInit(): void {
    this.walletService =
      this.client.getService<WalletServiceGrpc>(WALLET_SERVICE_NAME);
  }

  createWallet(data: CreateWalletGrpcRequest): Promise<WalletGrpcResponse> {
    return lastValueFrom(
      this.walletService.createWallet(data, createGrpcMetadataFromContext()),
    );
  }
}
