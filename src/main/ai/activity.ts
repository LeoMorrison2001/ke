export type AiActivityType = 'generation' | 'tool'

export interface AiActivity {
  type: AiActivityType
  label: string
  toolName?: string
}

export const generationActivity: AiActivity = {
  type: 'generation',
  label: '小可正在思考'
}
