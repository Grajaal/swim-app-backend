import { Injectable } from '@nestjs/common'
import { PrismaService } from 'src/prisma.service'

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
}
