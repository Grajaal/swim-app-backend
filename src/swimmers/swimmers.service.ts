import {
  ConflictException,
  Injectable,
  NotFoundException
} from '@nestjs/common'
import { PrismaService } from 'src/prisma.service'
import { CreateDailyFormDto } from './dto/create-daily-form.dto'

@Injectable()
export class SwimmersService {
  constructor(private db: PrismaService) {}

  async createDailyForm(
    createDailyFormDto: CreateDailyFormDto,
    userId: string
  ) {
    const { sleepHours, sleepQuality, musclePain, fatigue, stress } =
      createDailyFormDto

    const dailyForm = await this.db.dailyForm.create({
      data: {
        swimmerId: userId,
        sleepHours,
        sleepQuality,
        musclePain,
        fatigue,
        stress
      }
    })

    return dailyForm
  }

  async getDailyFormStatus(swimmerId: string) {
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 1)

    const count = await this.db.dailyForm.count({
      where: {
        swimmerId,
        date: {
          gte: today,
          lt: tomorrow
        }
      }
    })

    return count > 0
  }

  async getSwimmerTeamStatus(swimmerId: string) {
    return await this.db.swimmer.findUnique({
      where: {
        id: swimmerId
      },
      select: {
        teamId: true
      }
    })
  }

  async joinTeam(swimmerId: string, teamCode: string) {
    const team = await this.db.team.findUnique({
      where: { teamCode },
      select: { id: true }
    })

    if (!team) {
      throw new NotFoundException('Team not found')
    }

    const swimmer = await this.db.swimmer.findUnique({
      where: { id: swimmerId },
      select: { teamId: true }
    })

    if (swimmer?.teamId) {
      throw new ConflictException('Swimmer already belongs to a team')
    }

    await this.db.swimmer.update({
      where: { id: swimmerId },
      data: { teamId: team.id }
    })

    return {
      teamId: team.id
    }
  }
}
