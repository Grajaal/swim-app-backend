import { Controller, Get, Query, UseGuards } from '@nestjs/common'
import { UsersService } from './users.service'
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard'

@Controller('users')
export class UsersController {
  constructor(private usersService: UsersService) {}

  @Get('')
  @UseGuards(JwtAuthGuard)
  async users(
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '15'
  ) {
    const pageInt = parseInt(page)
    const limitInt = parseInt(limit)
    return this.usersService.users({ page: pageInt, limit: limitInt })
  }
}
