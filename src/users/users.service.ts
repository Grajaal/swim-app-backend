import { ConflictException, Injectable } from '@nestjs/common'
import { Prisma, User } from '@prisma/client'
import { RegisterDto } from 'src/auth/dto/register.dto'
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

  createUser(data: RegisterDto): Promise<User> {
    return this.db.$transaction(async (db) => {
      const existingUser = await db.user.findUnique({
        where: {
          email: data.email
        }
      })

      if (existingUser) {
        throw new ConflictException('User with this email already exists')
      }

      const user = await db.user.create({
        data: {
          email: data.email,
          password: data.password,
          role: data.role
        }
      })

      if (data.role === 'COACH') {
        await db.coach.create({
          data: {
            id: user.id,
            firstName: data.firstName,
            lastName: data.lastName || ''
          }
        })
      } else if (data.role === 'SWIMMER') {
        await db.swimmer.create({
          data: {
            id: user.id,
            firstName: data.firstName,
            lastName: data.lastName || ''
          }
        })
      }

      return user
    })
  }
}
