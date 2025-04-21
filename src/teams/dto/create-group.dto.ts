import { ArrayNotEmpty, IsArray, IsString } from 'class-validator'

export class CreateGroupDto {
  @IsString()
  name: string

  @IsArray()
  @ArrayNotEmpty()
  swimmerIds: string[]
}
