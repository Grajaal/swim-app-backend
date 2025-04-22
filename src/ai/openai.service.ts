import { Injectable, Logger } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import OpenAI from 'openai'
import { getTools } from './functions/openai.functions'
import { ChatCompletionMessageParam } from 'openai/resources/chat'

@Injectable()
export class OpenAIService {
  private openai: OpenAI
  private readonly logger = new Logger(OpenAIService.name)

  constructor(private configService: ConfigService) {
    const apiKey = this.configService.get<string>('OPENAI_API_KEY')
    if (!apiKey) {
      throw new Error('OpenAI API key is not set')
    }
    this.openai = new OpenAI({ apiKey })
  }

  async createChatCompletion(messages: ChatCompletionMessageParam[]) {
    const tools = getTools()

    const completion = await this.openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages,
      tools
    })

    this.logger.log(`OpenAI response: ${JSON.stringify(completion)}`)

    return completion.choices[0].message
  }
}
