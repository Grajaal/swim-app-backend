import {
  ConflictException,
  Injectable,
  NotFoundException
} from '@nestjs/common'
import { Prisma, Role, User } from '@prisma/client'
import { RegisterDto } from 'src/auth/dto/register.dto'
import { PrismaService } from 'src/prisma.service'
import { GetUsersDto } from './dto/get-users-dto'
import { FindUsersParams } from './types'

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

  async createUser(data: RegisterDto): Promise<User> {
    return await this.db.$transaction(async (db) => {
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
    const { limit, page, role, search }: FindUsersParams = params

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
        swimmer: {
          include: {
            team: {
              select: {
                id: true,
                teamCode: true,
                coach: {
                  select: {
                    id: true,
                    firstName: true,
                    lastName: true
                  }
                },
                swimmers: {
                  select: {
                    id: true,
                    firstName: true,
                    lastName: true
                  }
                }
              }
            }
          }
        },
        coach: {
          include: {
            team: {
              select: {
                id: true,
                teamCode: true,
                swimmers: {
                  select: {
                    id: true,
                    firstName: true,
                    lastName: true
                  }
                }
              }
            }
          }
        }
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

  async deleteUser(userId: string): Promise<void> {
    const user = await this.db.user.findUnique({
      where: { id: userId },
      include: { coach: true }
    })

    if (!user) {
      throw new NotFoundException(`User with ID ${userId} not found`)
    }

    if (user.role === 'COACH' && user.coach) {
      const team = await this.db.team.findUnique({
        where: { coachId: user.coach.id }
      })
      if (team) {
        await this.db.swimmer.updateMany({
          where: { teamId: team.id },
          data: { teamId: null }
        })

        await this.db.team.delete({
          where: { id: team.id }
        })
      }
    }

    await this.db.user.delete({
      where: { id: userId }
    })
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
