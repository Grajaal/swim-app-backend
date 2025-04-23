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
  ChatCompletionMessageParam
} from 'openai/resources/chat/completions'
import { JwtRequest } from 'src/auth/interfaces/jwt-payload.interface'
import { CoachesService } from 'src/coaches/coaches.service'
import { Response } from 'express'
import { Stream } from 'openai/streaming'
import { HandlePromptDto } from './dto/handle-prompt.dto'

@Controller('ai')
export class AiController {
  private readonly logger = new Logger(AiController.name)

  constructor(
    private aiService: OpenAIService,
    private teamsService: TeamsService,
    private coachesService: CoachesService
  ) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  async handlePrompt(
    @Body() body: HandlePromptDto,
    @Req() req: JwtRequest,
    @Res() res: Response
  ): Promise<void> {
    // Ensure return type is void
    const currentDate = new Date().toISOString()
    const coach = await this.coachesService.coach({ id: req.user.userId })
    let finalStream: Stream<ChatCompletionChunk> | null = null

    const systemMessage = `You are a helpful assistant for a swimming coach.
      The current date is ${currentDate}. The user who is talking with you (who is the coach) is ${coach?.firstName}.`

    const messages: ChatCompletionMessageParam[] = [
      { role: 'system', content: systemMessage },
      ...body.history
    ]

    try {
      // Wrap the main logic in try/catch to handle errors before streaming starts
      // --- Step 1: Initial non-streaming call ---
      // Assuming createChatCompletion returns ChatCompletionMessage type from your service
      const initialAssistantMessage: ChatCompletionMessage =
        await this.aiService.createChatCompletion(messages)

      // --- FIX: Push the correct message object ---
      messages.push(initialAssistantMessage) // Add assistant's response message

      // --- Step 2: Check for tool calls ---
      if (!initialAssistantMessage.tool_calls) {
        this.logger.log(
          'No tool call detected. Calling AI again for streaming.'
        )
        finalStream = await this.aiService.createChatStreamCompletion(messages)
      } else if (initialAssistantMessage.tool_calls[0].type === 'function') {
        this.logger.log(
          `Tool call detected: ${initialAssistantMessage.tool_calls[0].id}`
        )
        const toolCall = initialAssistantMessage.tool_calls[0]
        const func = toolCall.function
        const args = JSON.parse(func.arguments)

        let toolResultContent: string | null = null

        // --- Step 3: Execute Tool ---
        try {
          if (func.name === 'get_team_details') {
            const teamDetails = await this.teamsService.getTeamByCoachId(
              req.user.userId,
              { includeGroups: true, includeSwimmers: true }
            )
            if (!teamDetails)
              throw new NotFoundException('Team not found for coach ID')
            toolResultContent = JSON.stringify(teamDetails)
          } else if (func.name === 'get_all_trainings') {
            const trainings = await this.teamsService.getTrainingsByCoachId(
              req.user.userId
            )
            toolResultContent = JSON.stringify(trainings)
          } else if (func.name === 'get_trainings_by_date') {
            const { date } = args
            const trainings = await this.teamsService.getTrainingsByCoachId(
              req.user.userId,
              date
            )
            toolResultContent = JSON.stringify(trainings)
          } else if (func.name === 'get_trainings_by_date_range') {
            const { startDate, endDate } = args
            const trainings = await this.teamsService.getTrainingsByCoachId(
              req.user.userId,
              undefined,
              startDate,
              endDate
            )
            toolResultContent = JSON.stringify(trainings)
          } else {
            this.logger.warn(`Unknown function called: ${func.name}`)
            toolResultContent = `Error: Unknown function ${func.name}`
          }
        } catch (error) {
          this.logger.error(`Error executing tool ${func.name}:`, error)
          toolResultContent = `Error executing function ${func.name}: ${error instanceof Error ? error.message : 'Unknown error'}`
          // Optionally send error back immediately if tool fails critically
          // if (!res.headersSent) {
          //    res.status(500).send(`Failed to execute tool: ${func.name}`);
          // }
          // return; // Exit if tool failed critically
        }

        if (toolResultContent !== null) {
          messages.push({
            role: 'tool',
            tool_call_id: toolCall.id,
            content: toolResultContent
          })

          // --- Step 4: Call AI again with tool result (streaming) ---
          this.logger.log('Calling AI again with tool result (streaming)')
          finalStream =
            await this.aiService.createChatStreamCompletion(messages)
        } else {
          // Handle case where tool execution failed critically before getting content
          this.logger.error(
            'Tool execution failed, cannot proceed to final AI call.'
          )
          if (!res.headersSent) {
            res.status(500).send('Failed to execute required tool.')
          }
          return // Exit
        }
      }

      // --- Step 5: Handle the final stream ---
      if (!finalStream) {
        this.logger.error('Final stream is null, cannot send response.')
        if (!res.headersSent) {
          res
            .status(500)
            .send('Internal server error: Failed to generate response stream.')
        }
        return // Exit
      }

      // --- Set Headers and Stream ---
      if (!res.headersSent) {
        res.setHeader('Content-Type', 'text/plain; charset=utf-8')
        res.setHeader('Cache-Control', 'no-cache')
        res.setHeader('Connection', 'keep-alive')
        res.setHeader('Transfer-Encoding', 'chunked')
        res.flushHeaders() // Send headers immediately
      }

      // Use try...finally around the loop to ensure res.end() is called
      try {
        for await (const chunk of finalStream) {
          const content = chunk.choices[0]?.delta?.content
          if (content) {
            if (!res.writableEnded) {
              res.write(content) // Write the text chunk
            } else {
              this.logger.warn(
                'Response stream ended prematurely, breaking loop.'
              )
              break // Exit loop if client disconnected
            }
          }
        }
      } finally {
        // --- CRUCIAL: Ensure res.end() is always called after the loop ---
        if (!res.writableEnded) {
          this.logger.log('Ending response stream.')
          res.end()
        }
      }
    } catch (error) {
      // Catch errors from initial AI call or tool logic
      this.logger.error(
        'Error handling prompt before streaming started:',
        error
      )
      if (!res.headersSent) {
        // Send an error response if headers haven't been sent
        res
          .status(500)
          .send(
            `Server error processing request: ${error instanceof Error ? error.message : 'Unknown error'}`
          )
      } else if (!res.writableEnded) {
        // If headers were sent but stream didn't finish, just end it.
        res.end()
      }
    }
    // No return statement needed as we handle the response manually
  }
}
