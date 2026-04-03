import { IsUUID } from 'class-validator';

export class CreateWalletRequestDto {
  @IsUUID()
  userId!: string;
}
