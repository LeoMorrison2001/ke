import { getDatabase } from './database'
import { randomUUID } from 'node:crypto'

export type UserGender = 'male' | 'female'
export type UserProfileField = 'name' | 'gender' | 'birth_date' | 'preferred_name'
export type UserProfileChangeSource = 'ai_tool' | 'settings' | 'onboarding'

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

interface UpdateActiveUserProfileFieldInput {
  field: UserProfileField
  value: string
  source: UserProfileChangeSource
  toolName?: string
  conversationId?: string
  toolCallId?: string
}

interface UpdateActiveUserProfileFieldResult {
  previousValue: string
  value: string
  changed: boolean
}

export interface UpdatePreferredNameInput extends Omit<
  UpdateActiveUserProfileFieldInput,
  'field' | 'value'
> {
  preferredName: string
}

export interface UpdatePreferredNameResult {
  previousPreferredName: string
  preferredName: string
  changed: boolean
}

export interface UpdateNameInput extends Omit<
  UpdateActiveUserProfileFieldInput,
  'field' | 'value'
> {
  name: string
}

export interface UpdateNameResult {
  previousName: string
  name: string
  changed: boolean
}

export interface UpdateGenderInput extends Omit<
  UpdateActiveUserProfileFieldInput,
  'field' | 'value'
> {
  gender: UserGender
}

export interface UpdateGenderResult {
  previousGender: UserGender
  gender: UserGender
  changed: boolean
}

export interface UpdateBirthDateInput extends Omit<
  UpdateActiveUserProfileFieldInput,
  'field' | 'value'
> {
  birthDate: string
}

export interface UpdateBirthDateResult {
  previousBirthDate: string
  birthDate: string
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

const validateText = (value: string, label: string): string => {
  const normalizedValue = value.trim()
  if (!normalizedValue) throw new Error(`${label}不能为空。`)
  if (Array.from(normalizedValue).length > 40) throw new Error(`${label}不能超过 40 个字符。`)
  return normalizedValue
}

const validateBirthDate = (value: string): string => {
  const birthDate = value.trim()
  const matched = /^(\d{4})-(\d{2})-(\d{2})$/.exec(birthDate)
  if (!matched) throw new Error('请选择有效的出生日期。')

  const [year, month, day] = matched.slice(1).map(Number)
  const date = new Date(Date.UTC(year, month - 1, day))
  const isValidDate =
    date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day
  const today = new Date()
  const todayAtMidnight = new Date(today.getFullYear(), today.getMonth(), today.getDate())

  if (!isValidDate || date.getTime() > todayAtMidnight.getTime()) {
    throw new Error('请选择有效的出生日期。')
  }

  return birthDate
}

const normalizeProfileValue = (field: UserProfileField, value: string): string => {
  if (field === 'name') return validateText(value, '姓名')
  if (field === 'preferred_name') return validateText(value, '称呼')
  if (field === 'birth_date') return validateBirthDate(value)
  if (value !== 'male' && value !== 'female') throw new Error('请选择有效的性别。')
  return value
}

const getActiveUserRow = (): UserRow | undefined => {
  return getDatabase()
    .prepare(
      `SELECT id, name, gender, birth_date, preferred_name
       FROM users WHERE is_active = 1 LIMIT 1`
    )
    .get() as UserRow | undefined
}

export const getActiveUser = (): ActiveUser | undefined => {
  const row = getActiveUserRow()

  return row ? toActiveUser(row) : undefined
}

export const requireActiveUser = (): ActiveUser => {
  const user = getActiveUser()
  if (!user) throw new Error('请先完成个人资料配置。')
  return user
}

const requireActiveUserRow = (): UserRow => {
  const user = getActiveUserRow()
  if (!user) throw new Error('请先完成个人资料配置。')
  return user
}

export const createInitialUser = (input: CreateUserInput): ActiveUser => {
  const name = normalizeProfileValue('name', input.name)
  const preferredName = normalizeProfileValue('preferred_name', input.preferredName)
  const birthDate = normalizeProfileValue('birth_date', input.birthDate)
  const gender = normalizeProfileValue('gender', input.gender) as UserGender

  const database = getDatabase()
  if (getActiveUser()) throw new Error('当前已有生效用户。')

  const now = Date.now()
  const result = database
    .prepare(
      `INSERT INTO users (name, gender, birth_date, preferred_name, is_active, created_at, updated_at)
       VALUES (?, ?, ?, ?, 1, ?, ?)`
    )
    .run(name, gender, birthDate, preferredName, now, now)

  return {
    id: Number(result.lastInsertRowid),
    name,
    gender,
    birthDate,
    preferredName
  }
}

const updateActiveUserProfileField = (
  input: UpdateActiveUserProfileFieldInput
): UpdateActiveUserProfileFieldResult => {
  const value = normalizeProfileValue(input.field, input.value)
  const user = requireActiveUserRow()
  const previousValue = user[input.field]
  const changed = previousValue !== value
  const database = getDatabase()
  const now = Date.now()

  try {
    database.exec('BEGIN IMMEDIATE;')
    if (changed) {
      database
        .prepare(`UPDATE users SET ${input.field} = ?, updated_at = ? WHERE id = ?`)
        .run(value, now, user.id)
    }
    database
      .prepare(
        `INSERT INTO user_profile_change_logs
          (id, user_id, field_name, old_value, new_value, source, tool_name, conversation_id, tool_call_id, status, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .run(
        randomUUID(),
        user.id,
        input.field,
        previousValue,
        value,
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
    previousValue,
    value,
    changed
  }
}

export const updateActiveUserPreferredName = (
  input: UpdatePreferredNameInput
): UpdatePreferredNameResult => {
  const result = updateActiveUserProfileField({
    ...input,
    field: 'preferred_name',
    value: input.preferredName
  })

  return {
    previousPreferredName: result.previousValue,
    preferredName: result.value,
    changed: result.changed
  }
}

export const updateActiveUserName = (input: UpdateNameInput): UpdateNameResult => {
  const result = updateActiveUserProfileField({ ...input, field: 'name', value: input.name })
  return { previousName: result.previousValue, name: result.value, changed: result.changed }
}

export const updateActiveUserGender = (input: UpdateGenderInput): UpdateGenderResult => {
  const result = updateActiveUserProfileField({ ...input, field: 'gender', value: input.gender })
  return {
    previousGender: result.previousValue as UserGender,
    gender: result.value as UserGender,
    changed: result.changed
  }
}

export const updateActiveUserBirthDate = (input: UpdateBirthDateInput): UpdateBirthDateResult => {
  const result = updateActiveUserProfileField({
    ...input,
    field: 'birth_date',
    value: input.birthDate
  })
  return {
    previousBirthDate: result.previousValue,
    birthDate: result.value,
    changed: result.changed
  }
}
