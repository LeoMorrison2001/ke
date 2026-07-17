import { randomUUID } from 'node:crypto'
import { getDatabase } from './database'
import { requireActiveUser } from './user-repository'

const MESSAGE_PAGE_SIZE = 10

export interface ConversationSummary {
  id: string
  title: string
  conversationDate: string
  createdTime: string
  isPinned: boolean
}

export interface ConversationMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  createdTime: string
  cursor: number
}

export interface ConversationMessagePage {
  messages: ConversationMessage[]
  hasMore: boolean
}

interface ConversationMessageRow {
  id: string
  role: 'user' | 'assistant'
  content: string
  created_time: string
  cursor: number
}

const formatDate = (date: Date): string => {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

const formatTime = (date: Date): string => {
  const hour = String(date.getHours()).padStart(2, '0')
  const minute = String(date.getMinutes()).padStart(2, '0')
  const second = String(date.getSeconds()).padStart(2, '0')
  return `${hour}:${minute}:${second}`
}

const createTitle = (content: string): string => Array.from(content.trim()).slice(0, 20).join('')

const toConversationMessage = (row: ConversationMessageRow): ConversationMessage => ({
  id: row.id,
  role: row.role,
  content: row.content,
  createdTime: row.created_time,
  cursor: Number(row.cursor)
})

const ensureConversationOwnedBy = (conversationId: string, userId: number): void => {
  const row = getDatabase()
    .prepare('SELECT creator_id FROM conversations WHERE id = ?')
    .get(conversationId) as { creator_id: number } | undefined
  if (!row || row.creator_id !== userId) throw new Error('无权访问该对话。')
}

const ensureConversationActive = (conversationId: string, userId: number): void => {
  const row = getDatabase()
    .prepare('SELECT creator_id, is_archived FROM conversations WHERE id = ?')
    .get(conversationId) as { creator_id: number; is_archived: number } | undefined
  if (!row || row.creator_id !== userId) throw new Error('无权访问该对话。')
  if (row.is_archived === 1) throw new Error('该对话已归档，恢复后才能继续发送消息。')
}

export const saveUserMessage = (conversationId: string, content: string): ConversationMessage => {
  const database = getDatabase()
  const activeUser = requireActiveUser()
  const now = new Date()
  const messageId = randomUUID()
  const conversationDate = formatDate(now)
  const createdTime = formatTime(now)

  try {
    database.exec('BEGIN IMMEDIATE;')
    database
      .prepare(
        `INSERT OR IGNORE INTO conversations
          (id, creator_id, title, conversation_date, created_time, updated_at)
         VALUES (?, ?, ?, ?, ?, ?)`
      )
      .run(
        conversationId,
        activeUser.id,
        createTitle(content),
        conversationDate,
        createdTime,
        now.getTime()
      )
    ensureConversationActive(conversationId, activeUser.id)
    database
      .prepare(
        `INSERT INTO conversation_memories
          (id, conversation_id, creator_id, role, content, created_time)
         VALUES (?, ?, ?, 'user', ?, ?)`
      )
      .run(messageId, conversationId, activeUser.id, content, createdTime)
    database
      .prepare('UPDATE conversations SET updated_at = ? WHERE id = ? AND creator_id = ?')
      .run(now.getTime(), conversationId, activeUser.id)
    database.exec('COMMIT;')
  } catch (error) {
    try {
      database.exec('ROLLBACK;')
    } catch {
      // The transaction may not have started yet.
    }
    throw error
  }

  const row = database
    .prepare(
      `SELECT id, role, content, created_time, rowid AS cursor
       FROM conversation_memories WHERE id = ?`
    )
    .get(messageId) as unknown as ConversationMessageRow

  return toConversationMessage(row)
}

export const saveAssistantMessage = (
  conversationId: string,
  content: string
): ConversationMessage => {
  const database = getDatabase()
  const activeUser = requireActiveUser()
  const now = new Date()
  const messageId = randomUUID()
  const createdTime = formatTime(now)

  try {
    database.exec('BEGIN IMMEDIATE;')
    ensureConversationOwnedBy(conversationId, activeUser.id)
    database
      .prepare(
        `INSERT INTO conversation_memories
          (id, conversation_id, creator_id, role, content, created_time)
         VALUES (?, ?, ?, 'assistant', ?, ?)`
      )
      .run(messageId, conversationId, activeUser.id, content, createdTime)
    database
      .prepare('UPDATE conversations SET updated_at = ? WHERE id = ? AND creator_id = ?')
      .run(now.getTime(), conversationId, activeUser.id)
    database.exec('COMMIT;')
  } catch (error) {
    try {
      database.exec('ROLLBACK;')
    } catch {
      // The transaction may not have started yet.
    }
    throw error
  }

  const row = database
    .prepare(
      `SELECT id, role, content, created_time, rowid AS cursor
       FROM conversation_memories WHERE id = ?`
    )
    .get(messageId) as unknown as ConversationMessageRow

  return toConversationMessage(row)
}

export const listConversations = (): ConversationSummary[] => {
  const activeUser = requireActiveUser()
  const rows = getDatabase()
    .prepare(
      `SELECT id, title, conversation_date, created_time, is_pinned
       FROM conversations
       WHERE creator_id = ? AND is_archived = 0
       ORDER BY is_pinned DESC, updated_at DESC`
    )
    .all(activeUser.id) as Array<{
    id: string
    title: string
    conversation_date: string
    created_time: string
    is_pinned: number
  }>

  return rows.map((row) => ({
    id: row.id,
    title: row.title,
    conversationDate: row.conversation_date,
    createdTime: row.created_time,
    isPinned: row.is_pinned === 1
  }))
}

export const toggleConversationPinned = (conversationId: string): void => {
  const activeUser = requireActiveUser()
  getDatabase()
    .prepare(
      `UPDATE conversations
       SET is_pinned = CASE WHEN is_pinned = 1 THEN 0 ELSE 1 END,
           updated_at = ?
       WHERE id = ? AND creator_id = ?`
    )
    .run(Date.now(), conversationId, activeUser.id)
}

export const archiveConversation = (conversationId: string): void => {
  const activeUser = requireActiveUser()
  getDatabase()
    .prepare(
      `UPDATE conversations
       SET is_archived = 1, updated_at = ?
       WHERE id = ? AND creator_id = ? AND is_archived = 0`
    )
    .run(Date.now(), conversationId, activeUser.id)
}

export const getConversationMessagePage = (
  conversationId: string,
  beforeCursor?: number
): ConversationMessagePage => {
  const database = getDatabase()
  const activeUser = requireActiveUser()
  const query = beforeCursor
    ? `SELECT id, role, content, created_time, rowid AS cursor
       FROM conversation_memories
       WHERE conversation_id = ? AND creator_id = ? AND rowid < ?
       ORDER BY rowid DESC
       LIMIT ?`
    : `SELECT id, role, content, created_time, rowid AS cursor
       FROM conversation_memories
       WHERE conversation_id = ? AND creator_id = ?
       ORDER BY rowid DESC
       LIMIT ?`
  const rows = (beforeCursor
    ? database
        .prepare(query)
        .all(conversationId, activeUser.id, beforeCursor, MESSAGE_PAGE_SIZE + 1)
    : database
        .prepare(query)
        .all(
          conversationId,
          activeUser.id,
          MESSAGE_PAGE_SIZE + 1
        )) as unknown as ConversationMessageRow[]
  const hasMore = rows.length > MESSAGE_PAGE_SIZE

  return {
    messages: rows.slice(0, MESSAGE_PAGE_SIZE).reverse().map(toConversationMessage),
    hasMore
  }
}

export const getConversationMessagesForModel = (
  conversationId: string
): Array<Pick<ConversationMessage, 'role' | 'content'>> => {
  const activeUser = requireActiveUser()
  const rows = getDatabase()
    .prepare(
      `SELECT role, content
       FROM conversation_memories
       WHERE conversation_id = ? AND creator_id = ?
       ORDER BY rowid ASC`
    )
    .all(conversationId, activeUser.id) as Array<Pick<ConversationMessage, 'role' | 'content'>>

  return rows
}
