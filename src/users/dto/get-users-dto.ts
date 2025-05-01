import { IsIn, IsNumberString, IsOptional, IsString } from 'class-validator'

export class GetUsersDto {
  @IsOptional()
  @IsNumberString()
  page?: string

  @IsOptional()
  @IsNumberString()
  limit?: string

  @IsOptional()
  @IsString()
  search?: string

  @IsOptional()
  @IsString()
  @IsIn(['COACH', 'SWIMMER'])
  role?: string
}
