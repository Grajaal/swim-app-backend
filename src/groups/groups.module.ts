import { Module } from '@nestjs/common'
import { GroupsService } from './groups.service'
import { PrismaService } from 'src/prisma.service'
import { GroupsController } from './groups.controller'

@Module({
  providers: [GroupsService, PrismaService],
  controllers: [GroupsController]
})
export class GroupsModule {}
