import { IsString, MaxLength, MinLength } from 'class-validator'

export class JoinTeamDto {
  @MinLength(6)
  @MaxLength(6)
  @IsString()
  teamCode: string
}
