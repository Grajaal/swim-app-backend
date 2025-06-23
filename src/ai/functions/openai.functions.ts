import { ChatCompletionTool } from 'openai/resources/chat'

export const getTools: () => ChatCompletionTool[] = () => [
  {
    type: 'function',
    function: {
      name: 'get_coach_team_details',
      description:
        "Get coach's team details: team info, groups (id, name), and swimmers (id, firstName, lastName, birthDate). For team overview."
      // No parameters needed here as the backend AiController will use the coach's context
      // and call teamsService.getTeamByCoachId(userId, { includeGroups: true, includeSwimmers: true })
    }
  },
  {
    type: 'function',
    function: {
      name: 'get_coach_team_groups_with_swimmers',
      description:
        "Get coach's team groups. Returns groups with id, name, teamId, and a swimmers array (id, firstName, lastName, birthDate). For group member analysis."
      // No parameters needed here as the backend AiController will derive teamId from the coach's context
    }
  },
  {
    type: 'function',
    function: {
      name: 'get_coach_team_trainings',
      description:
        "Get coach's team trainings, filterable by date or date range. Returns trainings with id, date, minutes, meters, description, groupId. For charting training volume.",
      parameters: {
        type: 'object',
        properties: {
          date: {
            type: 'string',
            description: 'Specific date (YYYY-MM-DD).'
          },
          startDate: {
            type: 'string',
            description: 'Start date of range (YYYY-MM-DD).'
          },
          endDate: {
            type: 'string',
            description: 'End date of range (YYYY-MM-DD).'
          }
        }
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'display_chart',
      description: 'Display a chart using ShadCN Charts components.',
      parameters: {
        type: 'object',
        properties: {
          chart_type: {
            type: 'string',
            description: 'Type of chart (e.g., "bar", "line", "pie").',
            enum: [
              'bar',
              'line',
              'pie',
              'area',
              'radar',
              'radialBar',
              'scatter'
            ]
          },
          title: {
            type: 'string',
            description: 'Chart title.'
          },
          data: {
            type: 'array',
            description: 'Data to plot (array of objects).',
            items: {
              type: 'object'
            }
          },
          x_axis_key: {
            type: 'string',
            description: 'Key in data objects for x-axis.'
          },
          y_axis_keys: {
            type: 'array',
            description: 'Keys in data objects for y-axis values.',
            items: {
              type: 'string'
            }
          }
        },
        required: ['chart_type', 'title', 'data', 'x_axis_key', 'y_axis_keys']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'get_swimmer_profile',
      description:
        'Get swimmer profile: id, firstName, lastName, birthDate, teamId. For basic swimmer info.',
      parameters: {
        type: 'object',
        properties: {
          swimmer_id: {
            type: 'string',
            description: "Swimmer's ID."
          }
        },
        required: ['swimmer_id']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'get_swimmer_daily_forms',
      description:
        'Get swimmer daily wellness forms. Returns forms with id, date, swimmerId, and metrics (sleepHours, sleepQuality, musclePain, fatigue, stress - all numeric). For charting wellness trends.',
      parameters: {
        type: 'object',
        properties: {
          swimmer_id: {
            type: 'string',
            description: "Swimmer's ID."
          },
          date: {
            type: 'string',
            description: 'Specific date for forms (YYYY-MM-DD).'
          },
          start_date: {
            type: 'string',
            description: 'Start date for form range (YYYY-MM-DD).'
          },
          end_date: {
            type: 'string',
            description: 'End date for form range (YYYY-MM-DD).'
          }
        },
        required: ['swimmer_id']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'get_swimmer_assigned_trainings',
      description:
        "Get swimmer's assigned/participated trainings, filterable by date. Returns trainings with id, date, minutes, meters, description, groupId. For charting individual training load.",
      parameters: {
        type: 'object',
        properties: {
          swimmer_id: {
            type: 'string',
            description: "Swimmer's ID."
          },
          date: {
            type: 'string',
            description: 'Specific date for trainings (YYYY-MM-DD).'
          },
          start_date: {
            type: 'string',
            description: 'Start date for training range (YYYY-MM-DD).'
          },
          end_date: {
            type: 'string',
            description: 'End date for training range (YYYY-MM-DD).'
          }
        },
        required: ['swimmer_id']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'get_group_details',
      description:
        "Get group details by its name: id, name, teamId, memberSwimmers (id, firstName, lastName, birthDate), assignedTrainings (id, date, minutes, meters, description). The group name is resolved to an ID using the coach's context. For group analysis.",
      parameters: {
        type: 'object',
        properties: {
          group_name: {
            type: 'string',
            description: "The name of the group (e.g., 'Alevines')."
          },
          trainings_start_date: {
            type: 'string',
            description:
              'Optional. Start date (YYYY-MM-DD) to filter group trainings.'
          },
          trainings_end_date: {
            type: 'string',
            description:
              'Optional. End date (YYYY-MM-DD) to filter group trainings.'
          }
        },
        required: ['group_name']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'get_swimmer_id_by_name',
      description:
        "Resolve swimmer's name (full/partial) to their ID. Use if user provides name instead of ID for other functions.",
      parameters: {
        type: 'object',
        properties: {
          swimmer_name: {
            type: 'string',
            description:
              "Full or partial swimmer name (e.g., 'Jane Doe' or 'Jane')."
          }
        },
        required: ['swimmer_name']
      }
    }
  }
]
