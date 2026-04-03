import { AsyncLocalStorage } from 'async_hooks';
import { randomUUID } from 'crypto';

import { Metadata } from '@grpc/grpc-js';

export const REQUEST_ID_HEADER = 'x-request-id';
export const IDEMPOTENCY_KEY_HEADER = 'x-idempotency-key';

type RequestContextStore = {
  idempotencyKey?: string;
  requestId: string;
};

const storage = new AsyncLocalStorage<RequestContextStore>();

const isMetadata = (value: unknown): value is Metadata =>
  typeof value === 'object' &&
  value !== null &&
  'getMap' in value &&
  typeof (value as Metadata).getMap === 'function' &&
  'get' in value &&
  typeof (value as Metadata).get === 'function';

const getMetadataValue = (
  metadata: Metadata | undefined,
  key: string,
): string | undefined => {
  if (!metadata) {
    return undefined;
  }

  const value = metadata.get(key)[0];

  if (typeof value === 'string') {
    return value;
  }

  if (Buffer.isBuffer(value)) {
    return value.toString('utf8');
  }

  return value !== undefined ? String(value) : undefined;
};

export const extractGrpcMetadata = (args: unknown[]): Metadata | undefined => {
  for (const arg of args) {
    if (isMetadata(arg)) {
      return arg;
    }

    if (typeof arg === 'object' && arg !== null) {
      const metadataCandidate =
        'metadata' in arg ? (arg as { metadata?: unknown }).metadata : undefined;

      if (isMetadata(metadataCandidate)) {
        return metadataCandidate;
      }
    }
  }

  return undefined;
};

export const createRequestContext = (
  metadata?: Metadata,
): RequestContextStore => ({
  requestId: getMetadataValue(metadata, REQUEST_ID_HEADER) ?? randomUUID(),
  idempotencyKey: getMetadataValue(metadata, IDEMPOTENCY_KEY_HEADER),
});

export const createGrpcMetadataFromContext = (): Metadata => {
  const metadata = new Metadata();
  const store = storage.getStore();

  if (store?.requestId) {
    metadata.set(REQUEST_ID_HEADER, store.requestId);
  }

  if (store?.idempotencyKey) {
    metadata.set(IDEMPOTENCY_KEY_HEADER, store.idempotencyKey);
  }

  return metadata;
};

export const requestContext = {
  get: (): RequestContextStore | undefined => storage.getStore(),
  getIdempotencyKey: (): string | undefined => storage.getStore()?.idempotencyKey,
  getRequestId: (): string | undefined => storage.getStore()?.requestId,
  run: <T>(store: RequestContextStore, callback: () => T): T =>
    storage.run(store, callback),
};
