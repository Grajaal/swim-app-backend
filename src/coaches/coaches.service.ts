import { Injectable } from '@nestjs/common'
import { Prisma } from '@prisma/client'
import { PrismaService } from 'src/prisma.service'

@Injectable()
export class CoachesService {
  constructor(private db: PrismaService) {}

  async coach(coachWhereUniqueInput: Prisma.CoachWhereUniqueInput) {
    return await this.db.coach.findUnique({
      where: coachWhereUniqueInput
    })
  }
}
