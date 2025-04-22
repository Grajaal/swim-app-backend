/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import {
  Body,
  Controller,
  Logger,
  NotFoundException,
  Post,
  Req,
  UseGuards
} from '@nestjs/common'
import { OpenAIService } from './openai.service'
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard'
import { TeamsService } from 'src/teams/teams.service'
import { ChatCompletionMessageParam } from 'openai/resources/chat/completions'
import { JwtRequest } from 'src/auth/interfaces/jwt-payload.interface'

@Controller('ai')
export class AiController {
  private readonly logger = new Logger(AiController.name)

  constructor(
    private aiService: OpenAIService,
    private teamsService: TeamsService
  ) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  async handlePrompt(@Body('prompt') prompt: string, @Req() req: JwtRequest) {
    const currentDate = new Date().toISOString()
    const systemMessage = `You are a helpful assistant for a swimming coach. 
      The current date is ${currentDate}.`

    const messages: ChatCompletionMessageParam[] = [
      { role: 'system', content: systemMessage },
      { role: 'user', content: prompt }
    ]

    this.logger.log(`Received prompt: ${prompt}`)

    const result = await this.aiService.createChatCompletion(messages)
    messages.push(result)

    if (!result.tool_calls) {
      return
    }

    if (result.tool_calls[0].type === 'function') {
      this.logger.log(`Tool call: ${result.tool_calls[0].id}`)
      const func = result.tool_calls[0].function
      const args = JSON.parse(func.arguments)

      if (func.name === 'get_team_details') {
        const teamDetails = await this.teamsService.getTeamByCoachId(
          req.user.userId,
          { includeGroups: true, includeSwimmers: true }
        )
        if (!teamDetails) {
          throw new NotFoundException('Team not found for coach ID')
        }

        messages.push({
          role: 'tool',
          tool_call_id: result.tool_calls[0].id,
          content: JSON.stringify(teamDetails)
        })

        return await this.aiService.createChatCompletion(messages)
      } else if (func.name === 'get_all_trainings') {
        const trainings = await this.teamsService.getTrainingsByCoachId(
          req.user.userId
        )

        messages.push({
          role: 'tool',
          tool_call_id: result.tool_calls[0].id,
          content: JSON.stringify(trainings)
        })

        return await this.aiService.createChatCompletion(messages)
      } else if (func.name === 'get_trainings_by_date') {
        const { date } = args

        const trainigns = await this.teamsService.getTrainingsByCoachId(
          req.user.userId,
          date
        )

        messages.push({
          role: 'tool',
          tool_call_id: result.tool_calls[0].id,
          content: JSON.stringify(trainigns)
        })

        return await this.aiService.createChatCompletion(messages)
      } else if (func.name === 'get_trainings_by_date_range') {
        const { startDate, endDate } = args

        const trainings = await this.teamsService.getTrainingsByCoachId(
          req.user.userId,
          undefined,
          startDate,
          endDate
        )

        messages.push({
          role: 'tool',
          tool_call_id: result.tool_calls[0].id,
          content: JSON.stringify(trainings)
        })

        return await this.aiService.createChatCompletion(messages)
      }
    }
  }
}
