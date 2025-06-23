import { Module } from '@nestjs/common'
import { AiController } from './ai.controller'
import { OpenAIService } from './openai.service'
import { ConfigService } from '@nestjs/config'
import { TeamsService } from 'src/teams/teams.service'
import { PrismaService } from 'src/prisma.service'
import { CoachesService } from 'src/coaches/coaches.service'
import { SwimmersService } from 'src/swimmers/swimmers.service'

@Module({
  controllers: [AiController],
  providers: [
    OpenAIService,
    ConfigService,
    TeamsService,
    PrismaService,
    CoachesService,
    SwimmersService
  ]
})
export class AiModule {}
