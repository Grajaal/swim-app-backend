import { Controller, UseGuards, Get, Req } from '@nestjs/common'
import { JwtAuthGuard } from './auth/guards/jwt-auth.guard'
import { Request } from 'express'
@Controller()
export class AppController {
  @UseGuards(JwtAuthGuard)
  @Get('profile')
  getProfile(@Req() req: Request) {
    return req.user
  }
}
