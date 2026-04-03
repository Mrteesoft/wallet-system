import { IsUUID } from 'class-validator';

export class GetUserByIdRequestDto {
  @IsUUID()
  id!: string;
}
