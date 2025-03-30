import { IsNumber, IsString } from 'class-validator'

export class CreateDailyFormDto {
  @IsString()
  swimmerId: string
  @IsNumber()
  sleepHours: number
  @IsNumber()
  sleepQuality: number
  @IsNumber()
  musclePain: number
  @IsNumber()
  fatigue: number
  @IsNumber()
  stress: number
}
