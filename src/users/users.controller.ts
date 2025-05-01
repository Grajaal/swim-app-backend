import { Controller, Get, Query, UseGuards } from '@nestjs/common'
import { UsersService } from './users.service'
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard'
import { GetUsersDto } from './dto/get-users-dto'

@Controller('users')
export class UsersController {
  constructor(private usersService: UsersService) {}

  @Get('')
  @UseGuards(JwtAuthGuard)
  async users(@Query() query: GetUsersDto) {
    const page = parseInt(query.page ?? '1', 10)
    const limit = parseInt(query.limit ?? '10', 10)
    const { search, role } = query

    return this.usersService.users({ page, limit, search, role })
  }
}
