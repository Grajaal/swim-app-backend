import { Response } from 'express'

export interface ToolHandler {
  (args: any, userId: string, res?: Response): Promise<any>
}

export interface GetTrainingsArgs {
  date?: string
  startDate?: string
  endDate?: string
}

export interface GetSwimmerDailyFormsArgs {
  swimmer_id: string
  date?: string
  start_date?: string
  end_date?: string
}
