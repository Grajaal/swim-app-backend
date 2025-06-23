import {
  ConflictException,
  Injectable,
  NotFoundException
} from '@nestjs/common'
import { PrismaService } from 'src/prisma.service'
import { CreateGroupDto } from './dto/create-group.dto'
import { GetTeamOptions } from './types'
import { Prisma } from '@prisma/client'

@Injectable()
export class TeamsService {
  constructor(private db: PrismaService) {}

  async getTeamByCoachId(userId: string, options?: GetTeamOptions) {
    return await this.db.team.findUnique({
      where: {
        coachId: userId
      },
      include: {
        groups: options?.includeGroups ?? false,
        swimmers: options?.includeSwimmers ?? false
      }
    })
  }

  async getGroupsByTeamId(teamId: string) {
    return await this.db.group.findMany({
      where: { teamId },
      include: {
        swimmers: true
      }
    })
  }

  async createGroup(body: CreateGroupDto, teamId: string) {
    const { name, swimmerIds } = body

    const existingGroup = await this.db.group.findUnique({
      where: {
        teamId_name: {
          name,
          teamId
        }
      }
    })

    if (existingGroup) {
      throw new ConflictException(
        `Group with the name ${existingGroup.name} already exists`
      )
    }

    return await this.db.group.create({
      data: {
        name,
        teamId,
        swimmers: {
          connect: swimmerIds.map((id) => ({ id }))
        }
      }
    })
  }

  async getTrainingsByCoachId(
    coachId: string,
    date?: string,
    startDate?: string,
    endDate?: string
  ) {
    const team = await this.db.team.findUnique({
      where: {
        coachId
      },
      select: { id: true }
    })

    if (!team) {
      throw new NotFoundException('No team found for the given coach ID')
    }

    return await this.getTrainingsByTeamId(team.id, date, startDate, endDate)
  }

  async getTrainingsByTeamId(
    teamId: string,
    date?: string,
    startDate?: string,
    endDate?: string
  ) {
    const teamExists = await this.db.team.findUnique({
      where: { id: teamId }
    })

    if (!teamExists) {
      throw new NotFoundException(`Team with id ${teamId} not found`)
    }

    const whereClause: Prisma.TrainingWhereInput = {
      group: {
        teamId
      }
    }

    if (date) {
      const startOfDay = new Date(date)
      startOfDay.setUTCHours(0, 0, 0, 0)

      const endOfDay = new Date(date)
      endOfDay.setUTCHours(23, 59, 59, 999)

      whereClause.date = {
        gte: startOfDay,
        lte: endOfDay
      }
    } else if (startDate && endDate) {
      const start = new Date(startDate)
      start.setUTCHours(0, 0, 0, 0)

      const end = new Date(endDate)
      end.setUTCHours(23, 59, 59, 999)

      whereClause.date = {
        gte: start,
        lte: end
      }
    }

    return await this.db.training.findMany({
      where: whereClause,
      orderBy: {
        date: 'desc'
      }
    })
  }

  async getGroupById(groupId: string) {
    return await this.db.group.findUnique({
      where: { id: groupId },
      include: {
        swimmers: true,
        team: true
      }
    })
  }

  async getTrainingsByGroupId(
    groupId: string,
    specificDate?: string,
    startDate?: string,
    endDate?: string
  ) {
    const whereClause: Prisma.TrainingWhereInput = { groupId }
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

    return await this.db.training.findMany({
      where: whereClause,
      orderBy: { date: 'desc' }
    })
  }
}
