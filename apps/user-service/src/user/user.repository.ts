import { Injectable } from '@nestjs/common';
import { User } from '@prisma/client';

import { BaseRepository } from '../../../../packages/common/src/base/base.repository';
import { PrismaService } from '../../../../packages/common/src/prisma/prisma.service';

type CreateUserData = {
  email: string;
  name: string;
};

@Injectable()
export class UserRepository extends BaseRepository {
  constructor(prisma: PrismaService) {
    super(prisma);
  }

  findById(id: string): Promise<User | null> {
    return this.prisma.user.findUnique({
      where: { id },
    });
  }

  findByEmail(email: string): Promise<User | null> {
    return this.prisma.user.findUnique({
      where: { email },
    });
  }

  create(data: CreateUserData): Promise<User> {
    return this.prisma.user.create({
      data,
    });
  }
}
