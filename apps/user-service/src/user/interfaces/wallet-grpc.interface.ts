import { Observable } from 'rxjs';

export interface CreateWalletGrpcRequest {
  userId: string;
}

export interface WalletGrpcResponse {
  id: string;
  userId: string;
  balance: number;
  createdAt: string;
}

export interface WalletServiceGrpc {
  createWallet(data: CreateWalletGrpcRequest): Observable<WalletGrpcResponse>;
}
