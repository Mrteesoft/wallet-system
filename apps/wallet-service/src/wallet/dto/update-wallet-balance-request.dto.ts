import { Type } from 'class-transformer';
import { IsPositive, IsUUID } from 'class-validator';

export class UpdateWalletBalanceRequestDto {
  @IsUUID()
  userId!: string;

  @Type(() => Number)
  @IsPositive()
  amount!: number;
}
