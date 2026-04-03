import { Prisma } from '@prisma/client';

import { PrismaService } from '../prisma/prisma.service';

export abstract class BaseRepository {
  protected constructor(protected readonly prisma: PrismaService) {}

  protected toDecimal(value: Prisma.Decimal.Value): Prisma.Decimal {
    return new Prisma.Decimal(value);
  }

  protected toNumber(value: Prisma.Decimal | number): number {
    return Number(value);
  }
}
