import { join } from 'path';

export const USER_PROTO_PACKAGE = 'user';
export const USER_SERVICE_NAME = 'UserService';
export const USER_GRPC_CLIENT = 'USER_GRPC_CLIENT';

export const WALLET_PROTO_PACKAGE = 'wallet';
export const WALLET_SERVICE_NAME = 'WalletService';

export const getProtoPath = (fileName: string): string =>
  join(process.cwd(), 'packages', 'proto', fileName);

export const getGrpcUrl = (
  explicitUrlKey: string,
  hostKey: string,
  portKey: string,
  fallbackHost: string,
  fallbackPort: number,
): string => {
  const explicitUrl = process.env[explicitUrlKey];

  if (explicitUrl) {
    return explicitUrl;
  }

  const host = process.env[hostKey] ?? fallbackHost;
  const port = process.env[portKey] ?? String(fallbackPort);

  return `${host}:${port}`;
};

export const getGrpcListenUrl = (
  hostKey: string,
  portKey: string,
  fallbackHost: string,
  fallbackPort: number,
): string => {
  const host = process.env[hostKey] ?? fallbackHost;
  const port = process.env[portKey] ?? String(fallbackPort);

  return `${host}:${port}`;
};
