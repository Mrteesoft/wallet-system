import { PinoLogger } from 'nestjs-pino';

import { BaseGrpcService } from './base.grpc.service';

export abstract class BaseEntityGrpcService<TEntity, TResponse> extends BaseGrpcService {
  protected constructor(
    protected readonly logger: PinoLogger,
    context: string,
  ) {
    super();
    this.logger.setContext(context);
  }

  protected abstract toResponse(entity: TEntity): TResponse;

  protected toRequiredResponse(
    entity: TEntity | null | undefined,
    message: string,
  ): TResponse {
    return this.toResponse(this.ensureFound(entity, message));
  }

  protected toResponseCollection(entities: TEntity[]): TResponse[] {
    return entities.map((entity) => this.toResponse(entity));
  }

  protected logActionStarted(
    action: string,
    details: Record<string, unknown> = {},
  ): void {
    this.logger.info(
      {
        event: 'business_action_started',
        action,
        ...details,
      },
      'Business action started',
    );
  }

  protected logActionSucceeded(
    action: string,
    details: Record<string, unknown> = {},
  ): void {
    this.logger.info(
      {
        event: 'business_action_succeeded',
        action,
        ...details,
      },
      'Business action succeeded',
    );
  }

  protected logActionFailed(
    action: string,
    error: unknown,
    details: Record<string, unknown> = {},
  ): void {
    this.logger.error(
      {
        event: 'business_action_failed',
        action,
        error,
        ...details,
      },
      'Business action failed',
    );
  }

  protected logActionWarn(
    action: string,
    details: Record<string, unknown> = {},
  ): void {
    this.logger.warn(
      {
        event: 'business_action_warning',
        action,
        ...details,
      },
      'Business action warning',
    );
  }
}
