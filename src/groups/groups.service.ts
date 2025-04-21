import {
  ConflictException,
  Injectable,
  NotFoundException
} from '@nestjs/common'
import { PrismaService } from 'src/prisma.service'
import { UpdateGroupDto } from './dto/update-group.dto'
import { CreateTrainingDto } from './dto/create-training.dto'

@Injectable()
export class GroupsService {
  constructor(private db: PrismaService) {}

  async updateGroup(id: string, updateGroupDto: UpdateGroupDto) {
    const { name, swimmerIds } = updateGroupDto

    const existingGroup = await this.db.group.findUnique({
      where: { id }
    })

    if (!existingGroup) {
      throw new NotFoundException(`Group with id ${id} not found`)
    }

    const existingGroupWithName = await this.db.group.findUnique({
      where: {
        teamId_name: {
          name,
          teamId: existingGroup.teamId
        }
      }
    })

    if (existingGroupWithName) {
      if (existingGroup.id !== existingGroupWithName.id) {
        throw new ConflictException(
          `Group with the name ${existingGroupWithName.name} already exists`
        )
      }
    }

    return await this.db.group.update({
      where: { id },
      data: {
        ...(name && { name }),
        ...(swimmerIds && {
          swimmers: {
            set: swimmerIds.map((id) => ({
              id
            }))
          }
        })
      }
    })
  }

  async deleteGroup(id: string) {
    if (!(await this.groupExists(id))) {
      throw new NotFoundException(`Group with id ${id} not found`)
    }

    await this.db.group.delete({
      where: { id }
    })

    return
  }

  async createTraining(groupId: string, createTrainingDto: CreateTrainingDto) {
    const group = await this.db.group.findUnique({
      where: { id: groupId },
      include: { swimmers: true }
    })

    if (!group) {
      throw new NotFoundException(`Group with id ${groupId} not found`)
    }

    const { meters, minutes, date, description } = createTrainingDto

    return await this.db.training.create({
      data: {
        meters,
        minutes,
        date,
        description,
        groupId,
        swimmers: {
          connect: group.swimmers.map((swimmer) => ({
            id: swimmer.id
          }))
        }
      }
    })
  }

  async getTrainings(groupId: string, date?: string) {
    const group = await this.db.group.findUnique({
      where: { id: groupId }
    })

    if (!group) {
      throw new NotFoundException(`Group with id ${groupId} not found`)
    }

    if (date) {
      const startOfDay = new Date(date)
      startOfDay.setHours(0, 0, 0, 0)

      const endOfDay = new Date(date)
      endOfDay.setHours(23, 59, 59, 999)

      return await this.db.training.findMany({
        where: {
          groupId,
          date: {
            gte: startOfDay,
            lte: endOfDay
          }
        }
      })
    }

    return await this.db.training.findMany({
      where: { groupId }
    })
  }

  async deleteTraining(groupId: string, trainingId: string) {
    const groupExists = await this.groupExists(groupId)
    if (!groupExists) {
      throw new NotFoundException(`Group with id ${groupId} not found`)
    }

    const training = await this.db.training.findUnique({
      where: { id: trainingId },
      select: { id: true, groupId: true }
    })

    if (!training) {
      throw new NotFoundException(`Training with id ${trainingId} not found`)
    }

    if (training.groupId !== groupId) {
      throw new NotFoundException(
        `Training with id ${trainingId} does not belong to group with id ${groupId}`
      )
    }

    await this.db.training.delete({
      where: { id: trainingId }
    })

    return
  }

  async groupExists(id: string): Promise<boolean> {
    const group = await this.db.group.findUnique({
      where: { id }
    })

    return !!group
  }
}
