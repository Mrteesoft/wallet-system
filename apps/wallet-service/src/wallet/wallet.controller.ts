import { Controller } from '@nestjs/common';
import { GrpcMethod } from '@nestjs/microservices';

import { WALLET_SERVICE_NAME } from '../../../../packages/common/src/grpc/grpc.constants';

import { CreateWalletRequestDto } from './dto/create-wallet-request.dto';
import { GetWalletRequestDto } from './dto/get-wallet-request.dto';
import { UpdateWalletBalanceRequestDto } from './dto/update-wallet-balance-request.dto';
import { WalletResponse } from './interfaces/wallet-response.interface';
import { WalletService } from './wallet.service';

@Controller()
export class WalletController {
  constructor(private readonly walletService: WalletService) {}

  @GrpcMethod(WALLET_SERVICE_NAME, 'CreateWallet')
  createWallet(payload: CreateWalletRequestDto): Promise<WalletResponse> {
    return this.walletService.createWallet(payload);
  }

  @GrpcMethod(WALLET_SERVICE_NAME, 'GetWallet')
  getWallet(payload: GetWalletRequestDto): Promise<WalletResponse> {
    return this.walletService.getWallet(payload);
  }

  @GrpcMethod(WALLET_SERVICE_NAME, 'CreditWallet')
  creditWallet(
    payload: UpdateWalletBalanceRequestDto,
  ): Promise<WalletResponse> {
    return this.walletService.creditWallet(payload);
  }

  @GrpcMethod(WALLET_SERVICE_NAME, 'DebitWallet')
  debitWallet(payload: UpdateWalletBalanceRequestDto): Promise<WalletResponse> {
    return this.walletService.debitWallet(payload);
  }
}
