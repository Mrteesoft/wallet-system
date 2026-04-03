import { ArgumentsHost, Catch, Injectable } from '@nestjs/common';
import { BaseRpcExceptionFilter } from '@nestjs/microservices';

import { toRpcException } from '../errors/grpc-error.util';

@Catch()
@Injectable()
export class GrpcExceptionFilter extends BaseRpcExceptionFilter {
  override catch(exception: unknown, host: ArgumentsHost) {
    return super.catch(toRpcException(exception), host);
  }
}
