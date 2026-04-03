import { Module } from '@nestjs/common';
import { ClientsModule, Transport } from '@nestjs/microservices';

import {
  WALLET_GRPC_CLIENT,
  WALLET_PROTO_PACKAGE,
  getGrpcUrl,
  getProtoPath,
} from '../../../../packages/common/src';

import { UserController } from './user.controller';
import { WalletGrpcClient } from './wallet-grpc.client';
import { UserRepository } from './user.repository';
import { UserService } from './user.service';

@Module({
  imports: [
    ClientsModule.register([
      {
        name: WALLET_GRPC_CLIENT,
        transport: Transport.GRPC,
        options: {
          package: WALLET_PROTO_PACKAGE,
          protoPath: getProtoPath('wallet.proto'),
          url: getGrpcUrl(
            'WALLET_SERVICE_GRPC_URL',
            'WALLET_SERVICE_GRPC_HOST',
            'WALLET_SERVICE_GRPC_PORT',
            'localhost',
            50052,
          ),
        },
      },
    ]),
  ],
  controllers: [UserController],
  providers: [UserService, UserRepository, WalletGrpcClient],
})
export class UserModule {}
