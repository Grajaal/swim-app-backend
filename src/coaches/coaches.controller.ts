import { Controller, Get, Param, UseGuards } from '@nestjs/common'
import { CoachesService } from './coaches.service'
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard'

@Controller('coaches')
export class CoachesController {
  constructor(private coachesService: CoachesService) {}

  @Get(':coachId')
  @UseGuards(JwtAuthGuard)
  async getCoach(@Param('coachId') coachId: string) {
    return this.coachesService.coach({ id: coachId })
  }
}
