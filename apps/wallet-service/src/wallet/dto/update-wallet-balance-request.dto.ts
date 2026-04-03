import { Transform } from 'class-transformer';
import { IsString, IsUUID, Matches } from 'class-validator';

const POSITIVE_AMOUNT_PATTERN =
  /^(?!(?:0+)(?:\.0{1,2})?$)(?:0|[1-9]\d*)(?:\.\d{1,2})?$/;

export class UpdateWalletBalanceRequestDto {
  @IsUUID()
  userId!: string;

  @Transform(({ value }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsString()
  @Matches(POSITIVE_AMOUNT_PATTERN, {
    message: 'amount must be a positive decimal with up to 2 decimal places',
  })
  amount!: string;
}
