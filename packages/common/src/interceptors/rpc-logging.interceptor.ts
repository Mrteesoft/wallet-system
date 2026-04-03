import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { PinoLogger } from 'nestjs-pino';
import { Observable, throwError } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';

import {
  createRequestContext,
  extractGrpcMetadata,
  requestContext,
} from '../context/request-context';
import {
  getGrpcStatusName,
  mapExceptionToGrpcPayload as mapErrorToGrpcPayload,
} from '../errors/grpc-error.util';

@Injectable()
export class RpcLoggingInterceptor implements NestInterceptor {
  constructor(private readonly logger: PinoLogger) {
    this.logger.setContext(RpcLoggingInterceptor.name);
  }

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const rpcContext = context.switchToRpc();
    const payload = rpcContext.getData();
    const controllerName = context.getClass().name;
    const methodName = context.getHandler().name;
    const routeName = `${controllerName}.${methodName}`;
    const metadata = extractGrpcMetadata(context.getArgs());
    const requestDetails = createRequestContext(metadata);

    return requestContext.run(requestDetails, () => {
      this.logger.info(
        {
          event: 'rpc_request',
          routeName,
          payload: payload ?? {},
        },
        'Incoming gRPC request',
      );

      return next.handle().pipe(
        tap((response) => {
          this.logger.info(
            {
              event: 'rpc_response',
              routeName,
              grpcStatusCode: 0,
              grpcStatusName: getGrpcStatusName(0),
              response: response ?? {},
            },
            'Outgoing gRPC response',
          );
        }),
        catchError((error: unknown) => {
          const grpcError = mapErrorToGrpcPayload(error);

          this.logger.error(
            {
              event: 'rpc_error',
              routeName,
              grpcStatusCode: grpcError.code,
              grpcStatusName: getGrpcStatusName(grpcError.code),
              error,
            },
            'gRPC request failed',
          );

          return throwError(() => error);
        }),
      );
    });
  }
}
