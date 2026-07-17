import { getDatabase } from './database'

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
