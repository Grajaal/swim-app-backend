import { Module } from '@nestjs/common'
import { SwimmersService } from './swimmers.service'

@Module({
  providers: [SwimmersService]
})
export class SwimmersModule {}
