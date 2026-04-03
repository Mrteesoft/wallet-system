import { BaseGrpcService } from './base.grpc.service';

export abstract class BaseEntityGrpcService<TEntity, TResponse> extends BaseGrpcService {
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
}
