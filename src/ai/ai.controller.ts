/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import {
  Body,
  Controller,
  Logger,
  NotFoundException,
  Post,
  Req,
  Res,
  UseGuards
} from '@nestjs/common'
import { OpenAIService } from './openai.service'
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard'
import { TeamsService } from 'src/teams/teams.service'
import {
  ChatCompletionChunk,
  ChatCompletionMessage, // Import ChatCompletionMessage
  ChatCompletionMessageParam,
  ChatCompletionMessageToolCall,
  ChatCompletionTool,
  ChatCompletionToolMessageParam
} from 'openai/resources/chat/completions'
import { JwtRequest } from 'src/auth/interfaces/jwt-payload.interface'
import { CoachesService } from 'src/coaches/coaches.service'
import { Response } from 'express'
import { Stream } from 'openai/streaming'
import { HandlePromptDto } from './dto/handle-prompt.dto'
import { GetTrainingsArgs, ToolHandler } from './functions-args'
import { SwimmersService } from 'src/swimmers/swimmers.service'
import { Prisma } from '@prisma/client'

// Argument types for new functions
interface GetSwimmerProfileArgs {
  swimmer_id: string
}

interface GetSwimmerDailyFormsArgs {
  swimmer_id: string
  date?: string // ISO YYYY-MM-DD
  start_date?: string // ISO YYYY-MM-DD
  end_date?: string // ISO YYYY-MM-DD
}

interface GetSwimmerAssignedTrainingsArgs {
  swimmer_id: string
  date?: string // ISO YYYY-MM-DD
  start_date?: string // ISO YYYY-MM-DD
  end_date?: string // ISO YYYY-MM-DD
}

interface GetGroupDetailsArgs {
  group_name: string
  trainings_date?: string // ISO YYYY-MM-DD for specific day trainings
  trainings_start_date?: string // ISO YYYY-MM-DD
  trainings_end_date?: string // ISO YYYY-MM-DD
}

@Controller('ai')
export class AiController {
  private readonly logger = new Logger(AiController.name)
  private readonly toolHandlers: Record<string, ToolHandler>

  constructor(
    private aiService: OpenAIService,
    private teamsService: TeamsService,
    private coachesService: CoachesService,
    private swimmersService: SwimmersService
  ) {
    this.toolHandlers = {
      get_coach_team_details: this.handleGetCoachTeamDetails.bind(this),
      get_coach_team_trainings: this.handleGetCoachTeamTrainings.bind(this),
      get_coach_team_groups_with_swimmers:
        this.handleGetCoachTeamGroupsWithSwimmers.bind(this),
      get_swimmer_profile: this.handleGetSwimmerProfile.bind(this),
      get_swimmer_daily_forms: this.handleGetSwimmerDailyForms.bind(this),
      get_swimmer_assigned_trainings:
        this.handleGetSwimmerAssignedTrainings.bind(this),
      get_group_details: this.handleGetGroupDetails.bind(this),
      get_swimmer_id_by_name: this.handleGetSwimmerIdByName.bind(this)
    }
  }

  private sanitizeMessageForOpenAI(
    originalMessage: ChatCompletionMessage
  ): ChatCompletionMessageParam {
    // Ensure content is string or null, not undefined.
    // OpenAI API expects ChatCompletionContentPart[] for content if it's an array,
    // but for simple text, it's string | null.
    // Let's assume simple text content here or that ChatCompletionMessage.content is already string | null.
    const content =
      typeof originalMessage.content === 'string'
        ? originalMessage.content
        : null

    if (originalMessage.role === 'assistant') {
      const message: ChatCompletionMessageParam & { role: 'assistant' } = {
        role: 'assistant',
        content: content
      }
      if (originalMessage.tool_calls) {
        message.tool_calls = originalMessage.tool_calls.map((tc) => ({
          id: tc.id,
          type: tc.type, // type is 'function'
          function: {
            name: tc.function.name,
            arguments: tc.function.arguments
          }
        }))
      }
      return message
    }
    // For other roles, if they are guaranteed to be clean (e.g. from body.history or constructed 'tool' messages)
    // we can cast. If unsure, add specific sanitizers.
    // Assuming 'user' and 'system' messages from body.history are already ChatCompletionMessageParam.
    // 'tool' messages are constructed carefully in handlePrompt.
    return originalMessage as ChatCompletionMessageParam
  }

  @Post()
  @UseGuards(JwtAuthGuard)
  async handlePrompt(
    @Body() body: HandlePromptDto,
    @Req() req: JwtRequest,
    @Res() res: Response
  ): Promise<void> {
    const userId = req.user.userId
    const currentDate = new Date().toISOString()
    const coach = await this.coachesService.coach({ id: userId })

    const systemMessageContent = `You are a helpful assistant for a swimming coach.
      The current date is ${currentDate}. The user who is talking with you (who is the coach) is ${coach?.firstName ?? 'N/A'}.

      Only when the user explicitly asks for a "chart", "graph", "plot", "diagram", or a similar visual representation of data, should you attempt to display a chart. If the user asks for information (e.g., "What are the team trainings?", "Show me John's profile") but does NOT explicitly request a visual representation, you should provide the information textually and NOT call the 'display_chart' function. If they DO explicitly ask for a visual representation that requires information from the application (like training data, swimmer details, etc.):
      1. Identify what specific data is needed (e.g., trainings for a specific period, details of a team).
      2. Call the appropriate function to fetch this data first (e.g., 'get_trainings' for training data, 'get_team_details' for team information). Be precise with any required arguments like dates or IDs.
      3. Once you receive the data from the function, you MUST process and transform it into the format required for charting. This might involve summarizing, aggregating (e.g., summing up meters per day if multiple trainings occur on the same day), or selecting specific fields. If the data has a date or timestamp field and represents a time series (e.g., daily data over a week), you MUST sort the data by this date/timestamp in ascending (chronological) order before passing it to 'display_chart'. When selecting fields, you MUST only include the data fields explicitly relevant to the user's chart request. For example, if the user asks to chart 'stress levels over date', and the data source (e.g., daily forms) contains many other fields (like 'sleepHours', 'mood', etc.), your 'data' array for 'display_chart' should ONLY contain objects with the date and stress level fields (e.g., [{date: '...', stress: 4}, ...]). Do not include extraneous data fields in the arguments to 'display_chart', as this unnecessarily increases the data size.
      4. After processing the data, call the 'display_chart' function. Provide:
         - 'chart_type': (e.g., 'bar', 'line', 'pie').
         - 'title': A descriptive title for the chart.
         - 'data': The processed data as an array of objects. For example, for a bar chart of meters per day: [{ "day": "Mon", "total_meters": 5000 }, { "day": "Tue", "total_meters": 4500 }].
         - 'x_axis_key': The key in your data objects for the x-axis categories (e.g., "day").
         - 'y_axis_keys': An array of keys in your data objects for the y-axis values (e.g., ["total_meters"]). For multiple bars/lines per x-axis category, include multiple keys.
      5. Do not ask the user to confirm the data or the chart appearance before calling 'display_chart'. Present the chart directly.
      6. If the user's request is vague, ask for clarification on the type of chart or the specific data to plot before attempting to fetch or display anything.
      7. When calling 'get_trainings', if the user asks for a period like "last week" or "this month", calculate the appropriate 'startDate' and 'endDate' in ISO format based on the current date (${currentDate}).

      If the user provides a swimmer's name (e.g., "John Doe", "Jane") and you need a 'swimmer_id' for another function (like 'get_swimmer_profile' or 'get_swimmer_daily_forms'):
      1. You MUST first obtain the 'swimmer_id' by calling the 'get_swimmer_id_by_name' function with the 'swimmer_name' provided by the user.
      2. Examine the result of 'get_swimmer_id_by_name':
         a. If it returns a 'swimmer_id', use this ID directly in the subsequent function call that requires it.
         b. If it returns an 'error' message (e.g., swimmer not found), inform the user of this error.
         c. If it returns a 'clarification_needed' message (e.g., multiple swimmers found), present the issue and the list of matching swimmers to the user so they can clarify.
      3. Only after successfully obtaining a unique 'swimmer_id' should you proceed to call the function that originally needed it (e.g., 'get_swimmer_profile').
      4. Do not try to use a swimmer's name directly as a 'swimmer_id' in other function calls.
      `

    const messagesForOpenAICalls: ChatCompletionMessageParam[] = [
      { role: 'system', content: systemMessageContent },
      ...body.history
    ]

    let toolsWereCalledThisTurn = false

    try {
      while (true) {
        this.logger.log(
          `Calling AI for tool decision or direct response. Message count for call: ${messagesForOpenAICalls.length}`
        )
        const assistantDecisionMessage =
          await this.aiService.createChatCompletion(messagesForOpenAICalls)
        const sanitizedAssistantDecision = this.sanitizeMessageForOpenAI(
          assistantDecisionMessage
        )

        if (
          sanitizedAssistantDecision.role === 'assistant' &&
          sanitizedAssistantDecision.tool_calls &&
          sanitizedAssistantDecision.tool_calls.length > 0
        ) {
          const displayChartToolCall =
            sanitizedAssistantDecision.tool_calls.find(
              (tc) =>
                tc.type === 'function' && tc.function.name === 'display_chart'
            )

          if (displayChartToolCall) {
            this.logger.log(
              'Display_chart tool call detected. Sending assistant message (with tool_call) directly to frontend.'
            )
            res.setHeader('Content-Type', 'application/json')
            res.send(sanitizedAssistantDecision)
            return
          }

          toolsWereCalledThisTurn = true
          messagesForOpenAICalls.push(sanitizedAssistantDecision)
          this.logger.log('Tool calls detected, executing tools.')

          const toolExecutionPromises =
            sanitizedAssistantDecision.tool_calls.map(
              async (toolCall: ChatCompletionMessageToolCall) => {
                if (toolCall.type === 'function') {
                  return this.executeToolCall(toolCall, userId)
                }
                // This branch handles cases where toolCall.type is unexpectedly not 'function'.
                // The type ChatCompletionMessageToolCall implies .type should be 'function',
                // but defensively logging its actual value if different.
                this.logger.warn(
                  // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
                  `Unsupported tool call type encountered: '${toolCall.type}'. Full toolCall: ${JSON.stringify(toolCall)}`
                )
                return Promise.resolve(
                  JSON.stringify({
                    // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
                    error: `Unsupported tool call type: '${toolCall.type}'`
                  })
                )
              }
            )

          const toolResultsContents = await Promise.all(toolExecutionPromises)

          for (
            let i = 0;
            i < sanitizedAssistantDecision.tool_calls.length;
            i++
          ) {
            const toolCall = sanitizedAssistantDecision.tool_calls[i]
            messagesForOpenAICalls.push({
              role: 'tool',
              tool_call_id: toolCall.id,
              content:
                toolResultsContents[i] ?? 'Tool execution returned no content.'
            })
          }
        } else {
          this.logger.log(
            'No tool calls in the latest AI response, or not an assistant message with tools. Proceeding to final streaming.'
          )
          break
        }
      }

      if (toolsWereCalledThisTurn) {
        messagesForOpenAICalls.push({
          role: 'system',
          content:
            'You have successfully retrieved information using your tools. Please present this information clearly and directly to the coach. Avoid asking follow-up questions about the data itself and focus on delivering the retrieved information.'
        })
        this.logger.log(
          'Added system message to guide final AI output after tool use.'
        )
      }

      this.logger.log(
        `Calling AI for final streamed response. Message count: ${messagesForOpenAICalls.length}`
      )
      if (messagesForOpenAICalls.length > 0) {
        this.logger.debug(
          'Last messages before final stream call:',
          messagesForOpenAICalls.slice(
            -Math.min(3, messagesForOpenAICalls.length)
          )
        )
      }

      const finalStream = await this.aiService.createChatStreamCompletion(
        messagesForOpenAICalls
      )

      this.logger.log(
        'Successfully obtained stream from OpenAIService. Setting response headers for streaming.'
      )
      res.setHeader('Content-Type', 'text/event-stream')
      res.setHeader('Cache-Control', 'no-cache')
      res.setHeader('Connection', 'keep-alive')

      let chunkCount = 0
      try {
        for await (const chunk of finalStream) {
          chunkCount++
          const content = chunk.choices[0]?.delta?.content
          if (content) {
            res.write(content)
          }
        }
        this.logger.log(
          `Finished streaming response. Total chunks processed: ${chunkCount}.`
        )
      } catch (streamError) {
        this.logger.error('Error DURING streaming loop:', streamError)
        if (!res.writableEnded) {
          res.end('\nError: Stream abruptly terminated.')
        }
        return
      }

      if (!res.writableEnded) {
        res.end()
      }
    } catch (error) {
      this.logger.error('Error in handlePrompt:', error)
      if (!res.headersSent) {
        res.status(500).send('Server error processing request.')
      } else if (!res.writableEnded) {
        res.end()
      }
    }
  }

  private async executeToolCall(
    toolCall: ChatCompletionMessageToolCall,
    userId: string
  ): Promise<string | null> {
    const func = toolCall.function
    let args: any
    try {
      args = func.arguments ? JSON.parse(func.arguments) : {}
    } catch (parseError) {
      this.logger.error(
        `Failed to parse arguments for tool ${func.name}: ${func.arguments}`,
        parseError
      )
      return 'Error: Invalid arguments provided for function ${func.name}'
    }

    this.logger.log(
      `Executing tool: ${func.name} with args: ${JSON.stringify(args)}`
    )

    const handler = this.toolHandlers[func.name]

    if (!handler) {
      this.logger.warn(`Unknown function called: ${func.name}`)
      return `Error: Unknown function ${func.name}`
    }

    try {
      const result = await handler(args, userId)
      this.logger.log(result)

      return JSON.stringify(result)
    } catch (error) {
      this.logger.error(`Error executing tool ${func.name}:`, error)

      let errorMessage = `Error executing function ${func.name}: `
      if (error instanceof Error) {
        errorMessage += error.message
      } else {
        errorMessage += 'An unknown error occurred'
      }
      return errorMessage
    }
  }

  private async handleGetCoachTeamDetails(args: any, userId: string) {
    this.logger.log(
      `Handling get_coach_team_details for user ${userId} with args: ${JSON.stringify(args)}`
    )
    // The 'get_team_details' in openai.functions.ts was defined without parameters,
    // as it's contextually for the coach's team.
    // It maps to teamsService.getTeamByCoachId(userId, { includeGroups: true, includeSwimmers: true })
    // which is done in the AiController previously for 'get_team_details'
    const teamDetails = await this.teamsService.getTeamByCoachId(userId, {
      includeGroups: true,
      includeSwimmers: true
    })
    if (!teamDetails) {
      throw new NotFoundException('Team not found for the current coach.')
    }
    return JSON.stringify(teamDetails)
  }

  private async handleGetCoachTeamTrainings(
    args: GetTrainingsArgs,
    userId: string
  ) {
    this.logger.log(
      `Handling get_coach_team_trainings for user ${userId} with args: ${JSON.stringify(args)}`
    )
    const trainings = await this.teamsService.getTrainingsByCoachId(
      userId,
      args.date,
      args.startDate,
      args.endDate
    )
    return JSON.stringify(trainings)
  }

  private async handleGetCoachTeamGroupsWithSwimmers(
    args: any,
    userId: string
  ) {
    this.logger.log(
      `Handling get_coach_team_groups_with_swimmers for user ${userId}`
    )
    const team = await this.teamsService.getTeamByCoachId(userId) // Gets basic team info first
    if (!team || !team.id) {
      throw new NotFoundException(
        'Team not found for coach, cannot fetch groups.'
      )
    }
    // getGroupsByTeamId from TeamsService includes swimmers
    const groupsWithSwimmers = await this.teamsService.getGroupsByTeamId(
      team.id
    )
    return JSON.stringify(groupsWithSwimmers)
  }

  private async handleGetSwimmerProfile(
    args: GetSwimmerProfileArgs,
    userId: string // userId might be unused here if swimmer_id is globally unique and auth allows access
  ) {
    this.logger.log(
      `Handling get_swimmer_profile with args: ${JSON.stringify(args)}`
    )
    // SwimmersService.swimmer({ id: args.swimmer_id }) returns the swimmer.
    // Ensure it includes enough profile data (e.g., teamId is usually fine).
    // If full team object is needed, the service method should include it.
    const swimmerProfile = await this.swimmersService.swimmer({
      id: args.swimmer_id
    })
    if (!swimmerProfile) {
      throw new NotFoundException(
        `Swimmer with ID ${args.swimmer_id} not found.`
      )
    }
    return JSON.stringify(swimmerProfile)
  }

  private async handleGetSwimmerDailyForms(
    args: GetSwimmerDailyFormsArgs,
    userId: string // Unused if swimmer_id is sufficient
  ) {
    this.logger.log(
      `Handling get_swimmer_daily_forms with args: ${JSON.stringify(args)}`
    )
    // IDEAL: Call a method like this.swimmersService.getDailyForms(args.swimmer_id, args.date, args.start_date, args.end_date)
    // This method would need to be implemented in SwimmersService.
    // For now, constructing the logic here as an example; recommend moving to service.

    const whereClause: Prisma.DailyFormWhereInput = {
      swimmerId: args.swimmer_id
    }

    if (args.date) {
      const specificDate = new Date(args.date)
      const startOfDay = new Date(specificDate.setUTCHours(0, 0, 0, 0))
      const endOfDay = new Date(specificDate.setUTCHours(23, 59, 59, 999))
      whereClause.date = { gte: startOfDay, lte: endOfDay }
    } else if (args.start_date && args.end_date) {
      whereClause.date = {
        gte: new Date(new Date(args.start_date).setUTCHours(0, 0, 0, 0)),
        lte: new Date(new Date(args.end_date).setUTCHours(23, 59, 59, 999))
      }
    }
    // This requires SwimmersService to expose its 'db' property or have a generic findMany method.
    // A dedicated method in SwimmersService is preferred:
    // e.g., await this.swimmersService.findDailyForms({ where: whereClause, orderBy: { date: 'desc' } })
    // The following is a placeholder for direct db access if SwimmersService.db were public
    // const dailyForms = await this.swimmersService.db.dailyForm.findMany({
    //   where: whereClause,
    //   orderBy: { date: 'desc' }
    // });
    // ASSUMING a method getDailyForms exists or will be created in SwimmersService:
    const dailyForms = await this.swimmersService.getDailyForms(
      args.swimmer_id,
      args.date,
      args.start_date,
      args.end_date
    )
    return JSON.stringify(dailyForms)
  }

  private async handleGetSwimmerAssignedTrainings(
    args: GetSwimmerAssignedTrainingsArgs,
    userId: string // Unused if swimmer_id is sufficient
  ) {
    this.logger.log(
      `Handling get_swimmer_assigned_trainings with args: ${JSON.stringify(args)}`
    )
    // IDEAL: Call a method like this.swimmersService.getAssignedTrainings(args.swimmer_id, args.date, args.start_date, args.end_date)
    // This method would need to be implemented in SwimmersService.
    // It would internally fetch swimmer and include trainings with date filters.
    // ASSUMING a method getAssignedTrainings exists or will be created in SwimmersService:
    const trainings = await this.swimmersService.getAssignedTrainings(
      args.swimmer_id,
      args.date,
      args.start_date,
      args.end_date
    )
    return JSON.stringify(trainings)
  }

  private async handleGetGroupDetails(
    args: GetGroupDetailsArgs,
    userId: string // Este es el coachId
  ): Promise<string> {
    this.logger.log(
      `Handling get_group_details with args: ${JSON.stringify(args)} for coachId: ${userId}`
    )

    const team = await this.teamsService.getTeamByCoachId(userId)
    if (!team) {
      throw new NotFoundException(`No team found for coach ID ${userId}.`)
    }

    const groups = await this.teamsService.getGroupsByTeamId(team.id)
    if (!groups || groups.length === 0) {
      throw new NotFoundException(`No groups found for team ID ${team.id}.`)
    }

    // Encontrar el grupo por nombre (insensible a mayúsculas/minúsculas - exact match)
    const groupNameLower = args.group_name.toLowerCase()
    const foundGroup = groups.find(
      (group) => group.name.toLowerCase() === groupNameLower
    )

    if (!foundGroup) {
      this.logger.warn(
        `No group found with exact case-insensitive match for "${args.group_name}" in team "${team.id}".`
      )
      throw new NotFoundException(
        `Group with name "${args.group_name}" (case-insensitive) not found in team "${team.id}".`
      )
    }

    this.logger.log(
      `Found exact case-insensitive match for group "${args.group_name}": ${foundGroup.name}`
    )
    const groupId = foundGroup.id

    const groupInfo = await this.teamsService.getGroupById(groupId)
    if (!groupInfo) {
      this.logger.error(
        `Could not retrieve group details for a supposedly valid group ID ${groupId}`
      )
      throw new NotFoundException(
        `Group details could not be retrieved for ID ${groupId}. This might indicate an inconsistency.`
      )
    }

    const trainings = await this.teamsService.getTrainingsByGroupId(
      groupId,
      args.trainings_date,
      args.trainings_start_date,
      args.trainings_end_date
    )

    return JSON.stringify({ ...groupInfo, trainings })
  }

  private async handleGetSwimmerIdByName(
    args: { swimmer_name: string },
    userId: string
  ): Promise<object> {
    this.logger.log(
      `Handling get_swimmer_id_by_name for user ${userId} with args: ${JSON.stringify(args)}`
    )
    const swimmerNameLower = args.swimmer_name.toLowerCase()

    // Fetch all swimmers for the coach. This might be optimizable if SwimmersService
    // has a more direct way to search by name across a coach's swimmers.
    const teamDetails = await this.teamsService.getTeamByCoachId(userId, {
      includeSwimmers: true
    })

    if (!teamDetails || !teamDetails.swimmers) {
      return { error: 'Could not retrieve swimmer list for the team.' }
    }

    const matchingSwimmers = teamDetails.swimmers.filter((swimmer) => {
      const fullName =
        `${swimmer.firstName} ${swimmer.lastName || ''}`.toLowerCase()
      const firstNameLower = swimmer.firstName.toLowerCase()
      const lastNameLower = swimmer.lastName?.toLowerCase() || ''
      return (
        fullName.includes(swimmerNameLower) ||
        firstNameLower.includes(swimmerNameLower) ||
        (lastNameLower && lastNameLower.includes(swimmerNameLower))
      )
    })

    if (matchingSwimmers.length === 0) {
      return {
        error: `No swimmer found matching the name '${args.swimmer_name}'.`
      }
    }

    if (matchingSwimmers.length === 1) {
      return { swimmer_id: matchingSwimmers[0].id }
    }

    return {
      clarification_needed: true,
      matching_swimmers: matchingSwimmers.map((swimmer) => ({
        swimmer_id: swimmer.id,
        swimmer_name: `${swimmer.firstName} ${swimmer.lastName || ''}`
      }))
    }
  }
}
