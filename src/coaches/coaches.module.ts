import { Module } from '@nestjs/common'
import { CoachesService } from './coaches.service'
import { PrismaService } from 'src/prisma.service'
import { CoachesController } from './coaches.controller'

@Module({
  providers: [CoachesService, PrismaService],
  controllers: [CoachesController]
})
export class CoachesModule {}
