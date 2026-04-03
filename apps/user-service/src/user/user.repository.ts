import { Injectable } from '@nestjs/common';
import { User } from '@prisma/client';

import { BaseEntityRepository, PrismaService } from '../../../../packages/common/src';

type CreateUserData = {
  email: string;
  name: string;
};

@Injectable()
export class UserRepository extends BaseEntityRepository<User, CreateUserData> {
  protected readonly entityName = 'User';

  constructor(prisma: PrismaService) {
    super(prisma);
  }

  override findById(id: string): Promise<User | null> {
    return this.prisma.user.findUnique({
      where: { id },
    });
  }

  findByEmail(email: string): Promise<User | null> {
    return this.prisma.user.findUnique({
      where: { email },
    });
  }

  override create(data: CreateUserData): Promise<User> {
    return this.prisma.user.create({
      data,
    });
  }

  deleteById(id: string): Promise<User> {
    return this.prisma.user.delete({
      where: { id },
    });
  }
}
