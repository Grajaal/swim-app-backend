import { ConflictException, Injectable } from '@nestjs/common'
import { Prisma, User } from '@prisma/client'
import { PrismaService } from 'src/prisma.service'

@Injectable()
export class UsersService {
  constructor(private db: PrismaService) {}

  async user(
    userWhereUniqueInput: Prisma.UserWhereUniqueInput
  ): Promise<User | null> {
    return await this.db.user.findUnique({
      where: userWhereUniqueInput
    })
  }

  async createUser(data: Prisma.UserCreateInput): Promise<User> {
    const user = await this.db.user.findUnique({
      where: { email: data.email }
    })

    if (user) {
      throw new ConflictException('Email is already in use')
    }

    return this.db.user.create({
      data
    })
  }
}
