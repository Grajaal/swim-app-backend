import { Module } from '@nestjs/common'
import { TeamsController } from './teams.controller'
import { TeamsService } from './teams.service'
import { PrismaService } from 'src/prisma.service'
import { SwimmersService } from 'src/swimmers/swimmers.service'

@Module({
  controllers: [TeamsController],
  providers: [TeamsService, PrismaService, SwimmersService]
})
export class TeamsModule {}
