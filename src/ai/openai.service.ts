import { Injectable, Logger } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import OpenAI from 'openai'
import { getTools } from './functions/openai.functions'
import {
  ChatCompletion,
  ChatCompletionChunk,
  ChatCompletionMessageParam
} from 'openai/resources/chat'
import { Stream } from 'openai/streaming'
import { encoding_for_model, TiktokenModel } from 'tiktoken'

const MODEL_NAME: TiktokenModel = 'gpt-4.1-mini'
const MODEL_CONTEXT_WINDOW = 100000 // Using a conservative 100k tokens for gpt-4.1-mini
const CONTEXT_THRESHOLD_PERCENTAGE = 0.9 // Start pruning at 90% of context window

@Injectable()
export class OpenAIService {
  private openai: OpenAI
  private readonly logger = new Logger(OpenAIService.name)

  constructor(private configService: ConfigService) {
    const apiKey = this.configService.get<string>('OPENAI_API_KEY')
    if (!apiKey) {
      throw new Error('OpenAI API key is not set')
    }
    this.openai = new OpenAI({ apiKey, timeout: 60 * 1000 })
  }

  private manageContextAndGetMessages(
    messages: ChatCompletionMessageParam[]
  ): ChatCompletionMessageParam[] {
    const currentMessages = [...messages]
    let totalTokens = this.countTotalTokens(currentMessages)
    const maxTokens = MODEL_CONTEXT_WINDOW * CONTEXT_THRESHOLD_PERCENTAGE

    this.logger.log(
      `Initial token count: ${totalTokens}, Max tokens allowed: ${maxTokens}`
    )

    // Preserve system message if it exists
    const hasSystemMessage =
      currentMessages.length > 0 && currentMessages[0].role === 'system'
    const startIndexToPrune = hasSystemMessage ? 1 : 0

    while (
      totalTokens > maxTokens &&
      currentMessages.length > startIndexToPrune
    ) {
      if (
        currentMessages.length === startIndexToPrune + 1 &&
        hasSystemMessage
      ) {
        // Only system message left, cannot prune further (or log a warning)
        this.logger.warn(
          'Cannot prune further, only system message remains. Context might be too large.'
        )
        break
      }
      const removedMessage = currentMessages.splice(startIndexToPrune, 1)[0]
      totalTokens = this.countTotalTokens(currentMessages) // Recalculate after removal
      this.logger.log(
        `Removed message to save tokens. New total: ${totalTokens}. Removed: ${JSON.stringify(removedMessage.content)}`
      )
    }

    if (totalTokens > maxTokens) {
      this.logger.warn(
        `Context still exceeds threshold after pruning: ${totalTokens} tokens. Consider more aggressive pruning or summarization.`
      )
    }

    return currentMessages
  }

  private countTotalTokens(messages: ChatCompletionMessageParam[]): number {
    const encoding = encoding_for_model(MODEL_NAME)
    let totalTokens = 0
    for (const message of messages) {
      // Content can be null for some message types (e.g. tool calls), or an array of content parts
      if (message.content) {
        if (typeof message.content === 'string') {
          totalTokens += encoding.encode(message.content).length
        } else if (Array.isArray(message.content)) {
          for (const part of message.content) {
            if (part.type === 'text') {
              totalTokens += encoding.encode(part.text).length
            }
            // Add handling for other content part types if necessary (e.g., image_url)
          }
        }
      }
      if (message.role) {
        // Role also contributes to token count, approximately
        totalTokens += encoding.encode(message.role).length
      }
      // Add tokens for message structure, function calls, names etc.
      // OpenAI counts tokens in a specific way for chat messages,
      // roughly 4 tokens per message for metadata, plus content tokens.
      // This is a simplified calculation. For precise counting, refer to OpenAI's cookbook.
      totalTokens += 4 // Approximate tokens for message structure (role, name if present, etc.)
    }
    encoding.free()
    return totalTokens
  }

  async createChatCompletion(messages: ChatCompletionMessageParam[]) {
    const tools = getTools()
    const processedMessages = this.manageContextAndGetMessages(messages)

    const response = await this.openai.chat.completions.create({
      model: MODEL_NAME,
      messages: processedMessages,
      tools
    })

    this.logger.log(`OpenAI response: ${JSON.stringify(response)}`)

    return response.choices[0].message
  }

  async createChatStreamCompletion(messages: ChatCompletionMessageParam[]) {
    const tools = getTools()
    const processedMessages = this.manageContextAndGetMessages(messages)

    this.logger.log('Creating chat stream completion...')
    try {
      const stream = await this.openai.chat.completions.create({
        model: MODEL_NAME,
        messages: processedMessages,
        tools,
        stream: true
      })

      this.logger.log(`OpenAI stream response received.`)
      return stream
    } catch (error) {
      this.logger.error('Error in createChatStreamCompletion:', error)
      throw error
    }
  }

  countTokens(text: string): number {
    const encoding = encoding_for_model(MODEL_NAME)
    const tokens = encoding.encode(text)
    encoding.free()
    return tokens.length
  }
}
