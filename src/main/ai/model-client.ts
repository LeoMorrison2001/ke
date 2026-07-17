import { createOpenAICompatible } from '@ai-sdk/openai-compatible'

const chatProvider = createOpenAICompatible({
  name: 'liangrekui',
  baseURL: 'https://api.liangrekui.com/v1',
  apiKey: process.env.NEW_API_KEY
})

const chatModel = chatProvider('gpt-5.4')

export const getChatModel = (): typeof chatModel => chatModel
