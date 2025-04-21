import {
  Body,
  Controller,
  Get,
  NotFoundException,
  Post,
  Req,
  UseGuards
} from '@nestjs/common'
import { TeamsService } from './teams.service'
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard'
import { JwtRequest } from 'src/auth/interfaces/jwt-payload.interface'
import { SwimmersService } from 'src/swimmers/swimmers.service'
import { CreateGroupDto } from './dto/create-group.dto'

@Controller('teams')
export class TeamsController {
  constructor(
    private teamsService: TeamsService,
    private swimmersService: SwimmersService
  ) {}

  @Get('my-team')
  @UseGuards(JwtAuthGuard)
  async getMyTeam(@Req() req: JwtRequest) {
    return await this.teamsService.getTeamByCoachId(req.user.userId)
  }

  @Get('my-swimmers')
  @UseGuards(JwtAuthGuard)
  async getMySwimmers(@Req() req: JwtRequest) {
    return await this.swimmersService.getSwimmersByCoachId(req.user.userId)
  }

  @Get('groups')
  @UseGuards(JwtAuthGuard)
  async getGroupsByTeamId(@Req() req: JwtRequest) {
    const team = await this.teamsService.getTeamByCoachId(req.user.userId)

    if (!team) {
      return 'No team found'
    }

    return await this.teamsService.getGroupsByTeamId(team.id)
  }

  @Post('create-group')
  @UseGuards(JwtAuthGuard)
  async createGroup(@Req() req: JwtRequest, @Body() body: CreateGroupDto) {
    const team = await this.teamsService.getTeamByCoachId(req.user.userId)
    if (!team) {
      throw new NotFoundException('No team found')
    }

    return await this.teamsService.createGroup(body, team.id)
  }
}
