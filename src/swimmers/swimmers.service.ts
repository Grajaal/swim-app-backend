import {
  ConflictException,
  Injectable,
  NotFoundException
} from '@nestjs/common'
import { PrismaService } from 'src/prisma.service'
import { CreateDailyFormDto } from './dto/create-daily-form.dto'
import { Prisma } from '@prisma/client'

@Injectable()
export class SwimmersService {
  constructor(private db: PrismaService) {}

  async swimmer(swimmerWhereUniqueInput: Prisma.SwimmerWhereUniqueInput) {
    return await this.db.swimmer.findUnique({
      where: swimmerWhereUniqueInput
    })
  }

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

  async getSwimmersByTeamId(teamId: string) {
    return await this.db.swimmer.findMany({
      where: { teamId }
    })
  }

  async getSwimmersByCoachId(coachId: string) {
    const team = await this.db.team.findUnique({
      where: { coachId }
    })

    if (!team) {
      return []
    }

    return await this.getSwimmersByTeamId(team.id)
  }

  async getSwimmerDailyForm(swimmerId: string, date: Date) {
    const startOfDay = new Date(date)
    startOfDay.setUTCHours(0, 0, 0, 0)

    const endOfDay = new Date(date)
    endOfDay.setUTCHours(23, 59, 59, 999)

    return await this.db.dailyForm.findFirst({
      where: {
        swimmerId,
        date: {
          gte: startOfDay,
          lte: endOfDay
        }
      }
    })
  }

  async getDailyForms(
    swimmerId: string,
    specificDate?: string,
    startDate?: string,
    endDate?: string
  ) {
    const whereClause: Prisma.DailyFormWhereInput = { swimmerId }
    if (specificDate) {
      const date = new Date(specificDate)
      const startOfDay = new Date(date.setUTCHours(0, 0, 0, 0))
      const endOfDay = new Date(date.setUTCHours(23, 59, 59, 999))
      whereClause.date = { gte: startOfDay, lte: endOfDay }
    } else if (startDate && endDate) {
      whereClause.date = {
        gte: new Date(new Date(startDate).setUTCHours(0, 0, 0, 0)),
        lte: new Date(new Date(endDate).setUTCHours(23, 59, 59, 999))
      }
    }
    return await this.db.dailyForm.findMany({
      where: whereClause,
      orderBy: { date: 'desc' }
    })
  }

  async getAssignedTrainings(
    swimmerId: string,
    specificDate?: string,
    startDate?: string,
    endDate?: string
  ) {
    const trainingWhere: Prisma.TrainingWhereInput = {}
    if (specificDate) {
      const date = new Date(specificDate)
      const startOfDay = new Date(date.setUTCHours(0, 0, 0, 0))
      const endOfDay = new Date(date.setUTCHours(23, 59, 59, 999))
      trainingWhere.date = { gte: startOfDay, lte: endOfDay }
    } else if (startDate && endDate) {
      trainingWhere.date = {
        gte: new Date(new Date(startDate).setUTCHours(0, 0, 0, 0)),
        lte: new Date(new Date(endDate).setUTCHours(23, 59, 59, 999))
      }
    }

    return await this.db.swimmer.findUnique({
      where: { id: swimmerId },
      include: {
        trainings: {
          where: trainingWhere,
          orderBy: { date: 'desc' },
          include: { group: true } // Optionally include group details for each training
        }
      }
    })
  }
}
