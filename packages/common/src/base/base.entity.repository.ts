import { EntityNotFoundError } from '../errors/domain.errors';

import { BaseRepository } from './base.repository';

export abstract class BaseEntityRepository<TEntity, TCreateData> extends BaseRepository {
  protected abstract readonly entityName: string;

  abstract findById(id: string): Promise<TEntity | null>;
  abstract create(data: TCreateData): Promise<TEntity>;

  async findByIdOrThrow(id: string): Promise<TEntity> {
    return this.ensureEntity(
      await this.findById(id),
      `${this.entityName} ${id} not found`,
    );
  }

  protected ensureEntity(
    entity: TEntity | null | undefined,
    message: string,
  ): TEntity {
    if (!entity) {
      throw new EntityNotFoundError(message);
    }

    return entity;
  }
}
