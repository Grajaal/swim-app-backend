import { ConflictException, Injectable } from '@nestjs/common'
import { PrismaService } from 'src/prisma.service'
import { CreateGroupDto } from './dto/create-group.dto'

@Injectable()
export class TeamsService {
  constructor(private db: PrismaService) {}

  async getTeamByCoachId(userId: string) {
    return await this.db.team.findUnique({
      where: {
        coachId: userId
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
}
