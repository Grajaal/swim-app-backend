import { IsArray, IsOptional, IsString } from 'class-validator'

export class UpdateGroupDto {
  @IsOptional()
  @IsString()
  name: string

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  swimmerIds: string[]
}
