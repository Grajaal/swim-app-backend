import { Module } from '@nestjs/common'
import { AppController } from './app.controller'
import { AppService } from './app.service'
import { PrismaService } from './prisma.service'
import { UsersModule } from './users/users.module'
import { AuthModule } from './auth/auth.module'
import { SwimmersModule } from './swimmers/swimmers.module';
import { CoachesModule } from './coaches/coaches.module';

@Module({
  imports: [UsersModule, AuthModule, SwimmersModule, CoachesModule],
  controllers: [AppController],
  providers: [AppService, PrismaService]
})
export class AppModule {}
