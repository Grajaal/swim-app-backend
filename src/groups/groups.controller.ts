import {
  Controller,
  Param,
  Patch,
  UseGuards,
  Body,
  Delete,
  HttpCode,
  HttpStatus,
  Post,
  Get,
  Query
} from '@nestjs/common'
import { GroupsService } from './groups.service'
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard'

import { UpdateGroupDto } from './dto/update-group.dto'
import { CreateTrainingDto } from './dto/create-training.dto'

@Controller('groups')
export class GroupsController {
  constructor(private groupsService: GroupsService) {}

  @Patch(':groupId')
  @UseGuards(JwtAuthGuard)
  async updateGroup(
    @Param('groupId') groupId: string,
    @Body() updateGroupDto: UpdateGroupDto
  ) {
    return this.groupsService.updateGroup(groupId, updateGroupDto)
  }

  @Delete(':groupId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(JwtAuthGuard)
  async deleteGroup(@Param('groupId') groupId: string) {
    return this.groupsService.deleteGroup(groupId)
  }

  @Post(':groupId/trainings')
  @UseGuards(JwtAuthGuard)
  async createTraining(
    @Param('groupId') groupId: string,
    @Body() createTrainingDto: CreateTrainingDto
  ) {
    return this.groupsService.createTraining(groupId, createTrainingDto)
  }

  @Get(':groupId/trainings')
  @UseGuards(JwtAuthGuard)
  async getTrainings(
    @Param('groupId') groupId: string,
    @Query('date') date?: string
  ) {
    return await this.groupsService.getTrainings(groupId, date)
  }

  @Delete(':groupId/trainings/:trainingId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(JwtAuthGuard)
  async deleteTraining(
    @Param('groupId') groupId: string,
    @Param('trainingId') trainingId: string
  ) {
    return this.groupsService.deleteTraining(groupId, trainingId)
  }
}
