import { Body, Controller, Get, Post, Req, UseGuards } from '@nestjs/common'
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard'
import { JwtRequest } from 'src/auth/interfaces/jwt-payload.interface'
import { CreateDailyFormDto } from './dto/create-daily-form.dto'
import { SwimmersService } from './swimmers.service'

@Controller('swimmers')
export class SwimmersController {
  constructor(private swimmersService: SwimmersService) {}

  @Post('daily-form')
  @UseGuards(JwtAuthGuard)
  async createDailyForm(
    @Body() createDailyFormDto: CreateDailyFormDto,
    @Req() req: JwtRequest
  ) {
    return await this.swimmersService.createDailyForm(
      createDailyFormDto,
      req.user.userId
    )
  }

  @Get('daily-form/status')
  @UseGuards(JwtAuthGuard)
  async checkFormStatus(@Req() req: JwtRequest) {
    const hasSubmitted = await this.swimmersService.getDailyFormStatus(
      req.user.userId
    )
    return { hasSubmitted }
  }
}
