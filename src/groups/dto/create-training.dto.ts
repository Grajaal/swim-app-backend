import {
  IsDateString,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Min
} from 'class-validator'

export class CreateTrainingDto {
  @IsNumber()
  @Min(1)
  @IsNotEmpty()
  meters: number

  @IsNumber()
  @IsNotEmpty()
  @Min(1)
  minutes: number

  @IsDateString()
  date: string

  @IsString()
  @IsOptional()
  description: string
}
