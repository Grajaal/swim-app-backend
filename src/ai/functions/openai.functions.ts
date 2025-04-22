import { ChatCompletionTool } from 'openai/resources/chat'

export const getTools: () => ChatCompletionTool[] = () => [
  {
    type: 'function',
    function: {
      name: 'get_team_details',
      description: 'Get details for a specific team'
    }
  },
  {
    type: 'function',
    function: {
      name: 'get_all_trainings',
      description: 'Get all trainings recorded for the team'
    }
  },
  {
    type: 'function',
    function: {
      name: 'get_trainings_by_date',
      description: 'Get trainings for a specific date',
      parameters: {
        type: 'object',
        properties: {
          date: {
            type: 'string',
            description: 'The specific date in ISO format'
          }
        },
        required: ['date']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'get_trainings_by_date_range',
      description: 'Get trainings for a specific date range',
      parameters: {
        type: 'object',
        properties: {
          startDate: {
            type: 'string',
            description: 'Start date of the range in ISO format'
          },
          endDate: {
            type: 'string',
            description: 'End date of the range in ISO format'
          }
        },
        required: ['startDate', 'endDate']
      }
    }
  }
]
