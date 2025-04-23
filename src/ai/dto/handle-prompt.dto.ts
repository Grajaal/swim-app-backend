import { IsArray } from 'class-validator'
import { ChatCompletionMessageParam } from 'openai/resources/chat'

export class HandlePromptDto {
  @IsArray()
  history: ChatCompletionMessageParam[]
}
