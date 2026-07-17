import { getDatabase } from './database'
import { randomUUID } from 'node:crypto'

export type UserGender = 'male' | 'female'

export interface ActiveUser {
  id: number
  name: string
  gender: UserGender
  birthDate: string
  preferredName: string
}

export interface CreateUserInput {
  name: string
  gender: UserGender
  birthDate: string
  preferredName: string
}

export interface UpdatePreferredNameInput {
  preferredName: string
  source: 'ai_tool' | 'settings' | 'onboarding'
  toolName?: string
  conversationId?: string
  toolCallId?: string
}

export interface UpdatePreferredNameResult {
  previousPreferredName: string
  preferredName: string
  changed: boolean
}

interface UserRow {
  id: number
  name: string
  gender: UserGender
  birth_date: string
  preferred_name: string
}

const toActiveUser = (row: UserRow): ActiveUser => ({
  id: row.id,
  name: row.name,
  gender: row.gender,
  birthDate: row.birth_date,
  preferredName: row.preferred_name
})

export const getActiveUser = (): ActiveUser | undefined => {
  const row = getDatabase()
    .prepare(
      `SELECT id, name, gender, birth_date, preferred_name
       FROM users WHERE is_active = 1 LIMIT 1`
    )
    .get() as UserRow | undefined

  return row ? toActiveUser(row) : undefined
}

export const requireActiveUser = (): ActiveUser => {
  const user = getActiveUser()
  if (!user) throw new Error('请先完成个人资料配置。')
  return user
}

export const createInitialUser = (input: CreateUserInput): ActiveUser => {
  const name = input.name.trim()
  const preferredName = input.preferredName.trim()
  const birthDate = input.birthDate.trim()
  const validGenders: UserGender[] = ['male', 'female']

  if (!name || !preferredName) throw new Error('请填写姓名和希望小可使用的称呼。')
  if (!validGenders.includes(input.gender)) throw new Error('请选择有效的性别。')
  if (!/^\d{4}-\d{2}-\d{2}$/.test(birthDate) || Number.isNaN(Date.parse(`${birthDate}T00:00:00`))) {
    throw new Error('请选择有效的出生日期。')
  }

  const database = getDatabase()
  if (getActiveUser()) throw new Error('当前已有生效用户。')

  const now = Date.now()
  const result = database
    .prepare(
      `INSERT INTO users (name, gender, birth_date, preferred_name, is_active, created_at, updated_at)
       VALUES (?, ?, ?, ?, 1, ?, ?)`
    )
    .run(name, input.gender, birthDate, preferredName, now, now)

  return {
    id: Number(result.lastInsertRowid),
    name,
    gender: input.gender,
    birthDate,
    preferredName
  }
}

export const updateActiveUserPreferredName = (
  input: UpdatePreferredNameInput
): UpdatePreferredNameResult => {
  const preferredName = input.preferredName.trim()
  if (!preferredName) throw new Error('称呼不能为空。')
  if (Array.from(preferredName).length > 40) throw new Error('称呼不能超过 40 个字符。')

  const user = requireActiveUser()
  const changed = user.preferredName !== preferredName
  const database = getDatabase()
  const now = Date.now()

  try {
    database.exec('BEGIN IMMEDIATE;')
    if (changed) {
      database
        .prepare('UPDATE users SET preferred_name = ?, updated_at = ? WHERE id = ?')
        .run(preferredName, now, user.id)
    }
    database
      .prepare(
        `INSERT INTO user_profile_change_logs
          (id, user_id, field_name, old_value, new_value, source, tool_name, conversation_id, tool_call_id, status, created_at)
         VALUES (?, ?, 'preferred_name', ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .run(
        randomUUID(),
        user.id,
        user.preferredName,
        preferredName,
        input.source,
        input.toolName ?? null,
        input.conversationId ?? null,
        input.toolCallId ?? null,
        changed ? 'applied' : 'unchanged',
        now
      )
    database.exec('COMMIT;')
  } catch (error) {
    try {
      database.exec('ROLLBACK;')
    } catch {
      // The transaction may not have started yet.
    }
    throw error
  }

  return {
    previousPreferredName: user.preferredName,
    preferredName,
    changed
  }
}
