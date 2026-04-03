import { Prisma } from '@prisma/client';
import { status } from '@grpc/grpc-js';
import { RpcException } from '@nestjs/microservices';

export abstract class BaseGrpcService {
  protected notFound(message: string): never {
    throw new RpcException({ code: status.NOT_FOUND, message });
  }

  protected alreadyExists(message: string): never {
    throw new RpcException({ code: status.ALREADY_EXISTS, message });
  }

  protected invalidArgument(message: string): never {
    throw new RpcException({ code: status.INVALID_ARGUMENT, message });
  }

  protected failedPrecondition(message: string): never {
    throw new RpcException({ code: status.FAILED_PRECONDITION, message });
  }

  protected unavailable(message: string): never {
    throw new RpcException({ code: status.UNAVAILABLE, message });
  }

  protected ensureFound<T>(entity: T | null | undefined, message: string): T {
    if (!entity) {
      this.notFound(message);
    }

    return entity;
  }

  protected ensurePositiveAmount(
    amount: Prisma.Decimal.Value,
    fieldName = 'amount',
  ): Prisma.Decimal {
    const decimalAmount = new Prisma.Decimal(amount);

    if (!decimalAmount.isFinite() || decimalAmount.lte(0)) {
      this.invalidArgument(`${fieldName} must be a positive number`);
    }

    return decimalAmount;
  }
}
