import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  Req,
  UseGuards
} from '@nestjs/common'
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard'
import { JwtRequest } from 'src/auth/interfaces/jwt-payload.interface'
import { CreateDailyFormDto } from './dto/create-daily-form.dto'
import { SwimmersService } from './swimmers.service'
import { JoinTeamDto } from './dto/join-team.dto'
import { GetDailyFormDto } from './dto/get-daily-form.dto'

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

  @Get('team-status')
  @UseGuards(JwtAuthGuard)
  async getTeamStatus(@Req() req: JwtRequest) {
    const swimmer = await this.swimmersService.getSwimmerTeamStatus(
      req.user.userId
    )

    if (!swimmer) {
      return { hasTeam: false, teamId: null }
    }

    return { hasTeam: !!swimmer.teamId, teamId: swimmer.teamId }
  }

  @Post('join-team')
  @UseGuards(JwtAuthGuard)
  async joinTeam(@Req() req: JwtRequest, @Body() body: JoinTeamDto) {
    const result = await this.swimmersService.joinTeam(
      req.user.userId,
      body.teamCode
    )
    return {
      success: true,
      message: 'Team joined successfully',
      team: {
        id: result.teamId
      }
    }
  }

  @Get('daily-form')
  @UseGuards(JwtAuthGuard)
  async getDailyForm(@Query() query: GetDailyFormDto) {
    const date = query.date ? new Date(query.date) : new Date()
    const dailyForm = await this.swimmersService.getSwimmerDailyForm(
      query.swimmerId,
      date
    )
    return dailyForm
  }

  @Get(':swimmerId')
  @UseGuards(JwtAuthGuard)
  async getSwimmer(@Param('swimmerId') swimmerId: string) {
    return await this.swimmersService.swimmer({ id: swimmerId })
  }
}
