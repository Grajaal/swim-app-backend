import { Module } from '@nestjs/common'
import { AiController } from './ai.controller'
import { OpenAIService } from './openai.service'
import { ConfigService } from '@nestjs/config'
import { TeamsService } from 'src/teams/teams.service'
import { PrismaService } from 'src/prisma.service'

@Module({
  controllers: [AiController],
  providers: [OpenAIService, ConfigService, TeamsService, PrismaService]
})
export class AiModule {}
