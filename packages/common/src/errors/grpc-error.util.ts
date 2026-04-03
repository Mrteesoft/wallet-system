import { HttpException, HttpStatus } from '@nestjs/common';
import { status } from '@grpc/grpc-js';
import { Prisma } from '@prisma/client';
import { RpcException } from '@nestjs/microservices';

import {
  EntityNotFoundError,
  InsufficientBalanceError,
} from './domain.errors';

export type GrpcErrorPayload = {
  code: number;
  message: string;
};

export const getGrpcStatusName = (code: number): string =>
  status[code] ?? 'UNKNOWN';

const mapHttpStatusToGrpcStatus = (httpStatus: number): number => {
  switch (httpStatus) {
    case HttpStatus.BAD_REQUEST:
      return status.INVALID_ARGUMENT;
    case HttpStatus.NOT_FOUND:
      return status.NOT_FOUND;
    case HttpStatus.CONFLICT:
      return status.ALREADY_EXISTS;
    case HttpStatus.PRECONDITION_FAILED:
      return status.FAILED_PRECONDITION;
    case HttpStatus.SERVICE_UNAVAILABLE:
      return status.UNAVAILABLE;
    default:
      return status.INTERNAL;
  }
};

export const mapExceptionToGrpcPayload = (
  exception: unknown,
): GrpcErrorPayload => {
  if (exception instanceof RpcException) {
    const rpcError = exception.getError();

    if (typeof rpcError === 'string') {
      return {
        code: status.UNKNOWN,
        message: rpcError,
      };
    }

    if (typeof rpcError === 'object' && rpcError !== null) {
      return {
        code:
          typeof (rpcError as { code?: unknown }).code === 'number'
            ? (rpcError as { code: number }).code
            : status.UNKNOWN,
        message:
          typeof (rpcError as { message?: unknown }).message === 'string'
            ? (rpcError as { message: string }).message
            : 'Unknown gRPC error',
      };
    }
  }

  if (exception instanceof EntityNotFoundError) {
    return {
      code: status.NOT_FOUND,
      message: exception.message,
    };
  }

  if (exception instanceof InsufficientBalanceError) {
    return {
      code: status.FAILED_PRECONDITION,
      message: exception.message,
    };
  }

  if (exception instanceof Prisma.PrismaClientKnownRequestError) {
    if (exception.code === 'P2002') {
      return {
        code: status.ALREADY_EXISTS,
        message: 'Unique constraint violation',
      };
    }

    if (exception.code === 'P2025') {
      return {
        code: status.NOT_FOUND,
        message: 'Requested record was not found',
      };
    }

    return {
      code: status.INTERNAL,
      message: 'Database request failed',
    };
  }

  if (exception instanceof HttpException) {
    const response = exception.getResponse();

    return {
      code: mapHttpStatusToGrpcStatus(exception.getStatus()),
      message:
        typeof response === 'string'
          ? response
          : typeof response === 'object' &&
              response !== null &&
              'message' in response
            ? Array.isArray((response as { message?: unknown }).message)
              ? (response as { message: string[] }).message.join(', ')
              : String((response as { message?: unknown }).message)
            : exception.message,
    };
  }

  return {
    code: status.INTERNAL,
    message: 'Internal server error',
  };
};

export const toRpcException = (exception: unknown): RpcException =>
  exception instanceof RpcException
    ? exception
    : new RpcException(mapExceptionToGrpcPayload(exception));
