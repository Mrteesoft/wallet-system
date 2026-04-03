import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { status } from '@grpc/grpc-js';
import { PinoLogger } from 'nestjs-pino';
import { Observable, throwError } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';

const getStatusName = (code: number): string => status[code] ?? 'UNKNOWN';

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
            grpcStatusCode: status.OK,
            grpcStatusName: getStatusName(status.OK),
            response: response ?? {},
          },
          'Outgoing gRPC response',
        );
      }),
      catchError((error: unknown) => {
        const grpcStatusCode =
          typeof error === 'object' &&
          error !== null &&
          'code' in error &&
          typeof (error as { code?: unknown }).code === 'number'
            ? (error as { code: number }).code
            : status.UNKNOWN;

        this.logger.error(
          {
            event: 'rpc_error',
            routeName,
            grpcStatusCode,
            grpcStatusName: getStatusName(grpcStatusCode),
            error,
          },
          'gRPC request failed',
        );

        return throwError(() => error);
      }),
    );
  }
}
