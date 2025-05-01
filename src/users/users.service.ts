import { ConflictException, Injectable } from '@nestjs/common'
import { Prisma, Role, User } from '@prisma/client'
import { RegisterDto } from 'src/auth/dto/register.dto'
import { PrismaService } from 'src/prisma.service'
import { GetUsersDto } from './dto/get-users-dto'

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

        const teamCode = this.generateUniqueTeamCode()

        await db.team.create({
          data: {
            teamCode,
            coachId: user.id
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

  async users(params: FindUsersParams) {
    const { limit, page, role, search } = params
    const skip = (page - 1) * limit

    const where: Prisma.UserWhereInput = {}

    if (role) {
      where.role = role as Role
    }

    if (search) {
      where.OR = [
        {
          coach: {
            OR: [
              { firstName: { contains: search, mode: 'insensitive' } },
              { lastName: { contains: search, mode: 'insensitive' } }
            ]
          }
        },
        {
          swimmer: {
            OR: [
              { firstName: { contains: search, mode: 'insensitive' } },
              { lastName: { contains: search, mode: 'insensitive' } }
            ]
          }
        }
      ]
    }

    const users = await this.db.user.findMany({
      where,
      skip,
      take: limit,
      include: {
        swimmer: true,
        coach: true
      },
      orderBy: {
        createdAt: 'desc'
      }
    })

    const totalUsers = await this.db.user.count({ where })

    return {
      users,
      totalUsers,
      totalPages: Math.ceil(totalUsers / limit),
      currentPage: page
    }
  }

  private generateUniqueTeamCode(): string {
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
    let teamCode = ''

    for (let i = 0; i < 6; i++) {
      teamCode += characters.charAt(
        Math.floor(Math.random() * characters.length)
      )
    }

    return teamCode
  }
}
