import { Controller, Get, Req, UseGuards } from '@nestjs/common'
import { TeamsService } from './teams.service'
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard'
import { JwtRequest } from 'src/auth/interfaces/jwt-payload.interface'

@Controller('teams')
export class TeamsController {
  constructor(private teamsService: TeamsService) {}

  @UseGuards(JwtAuthGuard)
  @Get('my-team')
  async getMyTeam(@Req() req: JwtRequest) {
    return await this.teamsService.getTeamByCoachId(req.user.userId)
  }
}
