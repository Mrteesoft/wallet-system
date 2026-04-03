import { IsUUID } from 'class-validator';

export class GetWalletRequestDto {
  @IsUUID()
  userId!: string;
}
