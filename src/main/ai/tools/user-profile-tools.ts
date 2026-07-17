import { jsonSchema, tool, type Tool, type ToolSet } from 'ai'
import type { AiActivity } from '../activity'
import {
  updateActiveUserBirthDate,
  updateActiveUserGender,
  updateActiveUserName,
  updateActiveUserPreferredName,
  type UserGender
} from '../../user-repository'

interface PreferredNameToolOutput {
  changed: boolean
  previousPreferredName: string
  preferredName: string
}

interface NameToolOutput {
  changed: boolean
  previousName: string
  name: string
}

interface GenderToolOutput {
  changed: boolean
  previousGender: UserGender
  gender: UserGender
}

interface BirthDateToolOutput {
  changed: boolean
  previousBirthDate: string
  birthDate: string
}

interface ToolActivityPresentation {
  started: AiActivity
  completed: AiActivity
}

type UserProfileTools = ToolSet & {
  update_preferred_name: Tool<{ preferredName: string }, PreferredNameToolOutput>
  update_user_name: Tool<{ name: string }, NameToolOutput>
  update_user_gender: Tool<{ gender: UserGender }, GenderToolOutput>
  update_birth_date: Tool<{ birthDate: string }, BirthDateToolOutput>
}

export const userProfileToolActivities: Record<string, ToolActivityPresentation> = {
  update_preferred_name: {
    started: {
      type: 'tool',
      label: '正在更新称呼',
      toolName: 'update_preferred_name'
    },
    completed: {
      type: 'tool',
      label: '称呼已更新',
      toolName: 'update_preferred_name'
    }
  },
  update_user_name: {
    started: {
      type: 'tool',
      label: '正在更新姓名',
      toolName: 'update_user_name'
    },
    completed: {
      type: 'tool',
      label: '姓名已更新',
      toolName: 'update_user_name'
    }
  },
  update_user_gender: {
    started: {
      type: 'tool',
      label: '正在更新性别',
      toolName: 'update_user_gender'
    },
    completed: {
      type: 'tool',
      label: '性别已更新',
      toolName: 'update_user_gender'
    }
  },
  update_birth_date: {
    started: {
      type: 'tool',
      label: '正在更新出生日期',
      toolName: 'update_birth_date'
    },
    completed: {
      type: 'tool',
      label: '出生日期已更新',
      toolName: 'update_birth_date'
    }
  }
}

const preferredNameSchema = jsonSchema<{ preferredName: string }>({
  type: 'object',
  properties: {
    preferredName: {
      type: 'string',
      description: '要保存的长期称呼原文，长度不超过 40 个字符。'
    }
  },
  required: ['preferredName'],
  additionalProperties: false
})

const nameSchema = jsonSchema<{ name: string }>({
  type: 'object',
  properties: {
    name: {
      type: 'string',
      description: '用户明确提供的完整姓名原文，长度不超过 40 个字符。'
    }
  },
  required: ['name'],
  additionalProperties: false
})

const genderSchema = jsonSchema<{ gender: UserGender }>({
  type: 'object',
  properties: {
    gender: {
      type: 'string',
      enum: ['male', 'female'],
      description: '男性传 male，女性传 female。'
    }
  },
  required: ['gender'],
  additionalProperties: false
})

const birthDateSchema = jsonSchema<{ birthDate: string }>({
  type: 'object',
  properties: {
    birthDate: {
      type: 'string',
      pattern: '^\\d{4}-\\d{2}-\\d{2}$',
      description:
        '标准 ISO 出生日期，必须为 YYYY-MM-DD。调用前自行将自然语言日期转换为该格式，例如“2004年3月1日”传为“2004-03-01”。'
    }
  },
  required: ['birthDate'],
  additionalProperties: false
})

export const createUserProfileTools = (conversationId: string): UserProfileTools => ({
  update_preferred_name: tool({
    description:
      '更新小可对当前用户的长期称呼。仅在用户直接、明确表达“以后/今后/请记住这样叫我”时调用，例如“以后叫我宝贝”。传入用户指定的称呼原文。不要把姓名、临时玩笑、第三方信息或不明确表达保存为称呼；当前称呼已相同时不调用。',
    inputSchema: preferredNameSchema,
    strict: true,
    execute: async ({ preferredName }, { toolCallId }) => {
      const result = updateActiveUserPreferredName({
        preferredName,
        source: 'ai_tool',
        toolName: 'update_preferred_name',
        conversationId,
        toolCallId
      })

      return {
        changed: result.changed,
        previousPreferredName: result.previousPreferredName,
        preferredName: result.preferredName
      }
    }
  }),
  update_user_name: tool({
    description:
      '更新当前用户的姓名。仅在用户直接说明“我叫……”或明确要求更正姓名时调用。传入完整姓名原文。不要将昵称、对他人的称呼、引用内容或推测出的名字保存；当前姓名已相同时不调用。若多项资料一起更正，其他字段已经成功时，不要重复调用本工具。',
    inputSchema: nameSchema,
    strict: true,
    execute: async ({ name }, { toolCallId }) => {
      const result = updateActiveUserName({
        name,
        source: 'ai_tool',
        toolName: 'update_user_name',
        conversationId,
        toolCallId
      })

      return {
        changed: result.changed,
        previousName: result.previousName,
        name: result.name
      }
    }
  }),
  update_user_gender: tool({
    description:
      '更新当前用户的性别。仅在用户直接陈述自己的性别或明确要求更正性别时调用：男生传 male，女生传 female。不要依据姓名、外貌、称呼、语气或任何推测调用；当前性别已相同时不调用。若多项资料一起更正，其他字段已经成功时，不要重复调用本工具。',
    inputSchema: genderSchema,
    strict: true,
    execute: async ({ gender }, { toolCallId }) => {
      const result = updateActiveUserGender({
        gender,
        source: 'ai_tool',
        toolName: 'update_user_gender',
        conversationId,
        toolCallId
      })

      return {
        changed: result.changed,
        previousGender: result.previousGender,
        gender: result.gender
      }
    }
  }),
  update_birth_date: tool({
    description:
      '更新当前用户的出生日期。仅在用户明确提供完整年月日或明确要求更正生日时调用。调用参数必须是 YYYY-MM-DD；先自行将“2004年3月1日”转换为“2004-03-01”，不要要求用户重复输入格式。不要从年龄、星座、生肖、相对时间或不完整日期推断；当前生日已相同时不调用。若是在处理前一次失败的资料更正，只重试本字段，不要重复调用已经成功的姓名或性别工具。',
    inputSchema: birthDateSchema,
    strict: true,
    execute: async ({ birthDate }, { toolCallId }) => {
      const result = updateActiveUserBirthDate({
        birthDate,
        source: 'ai_tool',
        toolName: 'update_birth_date',
        conversationId,
        toolCallId
      })

      return {
        changed: result.changed,
        previousBirthDate: result.previousBirthDate,
        birthDate: result.birthDate
      }
    }
  })
})
