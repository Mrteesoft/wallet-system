import { Controller } from '@nestjs/common';
import { GrpcMethod } from '@nestjs/microservices';

import { USER_SERVICE_NAME } from '../../../../packages/common/src/grpc/grpc.constants';

import { CreateUserRequestDto } from './dto/create-user-request.dto';
import { GetUserByIdRequestDto } from './dto/get-user-by-id-request.dto';
import { UserResponse } from './interfaces/user-response.interface';
import { UserService } from './user.service';

@Controller()
export class UserController {
  constructor(private readonly userService: UserService) {}

  @GrpcMethod(USER_SERVICE_NAME, 'CreateUser')
  createUser(payload: CreateUserRequestDto): Promise<UserResponse> {
    return this.userService.createUser(payload);
  }

  @GrpcMethod(USER_SERVICE_NAME, 'GetUserById')
  getUserById(payload: GetUserByIdRequestDto): Promise<UserResponse> {
    return this.userService.getUserById(payload);
  }
}
