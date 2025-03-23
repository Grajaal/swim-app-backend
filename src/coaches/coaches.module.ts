import { Module } from '@nestjs/common'
import { CoachesService } from './coaches.service'
import { PrismaService } from 'src/prisma.service'

@Module({
  providers: [CoachesService, PrismaService]
})
export class CoachesModule {}
