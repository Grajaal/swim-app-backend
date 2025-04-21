import { IsDateString, IsOptional, IsString } from 'class-validator'

export class GetDailyFormDto {
  @IsString()
  swimmerId: string

  @IsDateString()
  @IsOptional()
  date?: string
}
