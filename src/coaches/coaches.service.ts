import { Injectable } from '@nestjs/common'
import { PrismaService } from 'src/prisma.service'

@Injectable()
export class CoachesService {
  constructor(private db: PrismaService) {}
}
