import { Module } from '@nestjs/common'
import { SwimmersService } from './swimmers.service'
import { PrismaService } from 'src/prisma.service'
import { SwimmersController } from './swimmers.controller'

@Module({
  controllers: [SwimmersController],
  providers: [SwimmersService, PrismaService]
})
export class SwimmersModule {}
