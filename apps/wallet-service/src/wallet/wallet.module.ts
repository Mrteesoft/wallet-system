import { Module } from '@nestjs/common';
import { ClientsModule, Transport } from '@nestjs/microservices';

import {
  USER_GRPC_CLIENT,
  USER_PROTO_PACKAGE,
  getGrpcUrl,
  getProtoPath,
} from '../../../../packages/common/src/grpc/grpc.constants';

import { UserGrpcClient } from './user-grpc.client';
import { WalletController } from './wallet.controller';
import { WalletRepository } from './wallet.repository';
import { WalletService } from './wallet.service';

@Module({
  imports: [
    ClientsModule.register([
      {
        name: USER_GRPC_CLIENT,
        transport: Transport.GRPC,
        options: {
          package: USER_PROTO_PACKAGE,
          protoPath: getProtoPath('user.proto'),
          url: getGrpcUrl(
            'USER_SERVICE_GRPC_URL',
            'USER_SERVICE_GRPC_HOST',
            'USER_SERVICE_GRPC_PORT',
            'localhost',
            50051,
          ),
        },
      },
    ]),
  ],
  controllers: [WalletController],
  providers: [WalletService, WalletRepository, UserGrpcClient],
})
export class WalletModule {}
