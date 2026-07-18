import {
  copyFileSync,
  existsSync,
  mkdirSync,
  readFileSync,
  rmSync,
  rmdirSync,
  writeFileSync
} from 'node:fs'
import { isAbsolute, join, resolve } from 'node:path'
import { DatabaseSync } from 'node:sqlite'
import { app } from 'electron'

const DATABASE_DIRECTORY_NAME = 'data'
const DATABASE_FILE_NAME = 'ke.sqlite'
const DATABASE_SCHEMA_VERSION = 12
const STORAGE_SETTINGS_FILE_NAME = 'storage-settings.json'

let database: DatabaseSync | undefined

interface StorageSettings {
  databaseDirectory?: string
}

export interface DatabaseLocation {
  directory: string
  databasePath: string
  isDefault: boolean
}

const applySchema = (connection: DatabaseSync): void => {
  const currentVersion = connection.prepare('PRAGMA user_version').get() as { user_version: number }

  if (currentVersion.user_version >= DATABASE_SCHEMA_VERSION) return

  try {
    connection.exec(`
      BEGIN;

      CREATE TABLE IF NOT EXISTS conversations (
        id TEXT PRIMARY KEY,
        creator_id INTEGER NOT NULL,
        title TEXT NOT NULL DEFAULT '',
        conversation_date TEXT NOT NULL,
        created_time TEXT NOT NULL,
        updated_at INTEGER NOT NULL,
        is_pinned INTEGER NOT NULL DEFAULT 0,
        is_archived INTEGER NOT NULL DEFAULT 0
      );

      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        gender TEXT NOT NULL CHECK (gender IN ('male', 'female')),
        birth_date TEXT NOT NULL,
        preferred_name TEXT NOT NULL,
        is_active INTEGER NOT NULL DEFAULT 1 CHECK (is_active IN (0, 1)),
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL
      );

      CREATE TABLE IF NOT EXISTS conversation_memories (
        id TEXT PRIMARY KEY,
        conversation_id TEXT NOT NULL,
        creator_id INTEGER NOT NULL,
        role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
        content TEXT NOT NULL,
        created_time TEXT NOT NULL,
        created_at INTEGER NOT NULL,
        FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS user_profile_change_logs (
        id TEXT PRIMARY KEY,
        user_id INTEGER NOT NULL,
        field_name TEXT NOT NULL,
        old_value TEXT NOT NULL,
        new_value TEXT NOT NULL,
        source TEXT NOT NULL CHECK (source IN ('ai_tool', 'settings', 'onboarding')),
        tool_name TEXT,
        conversation_id TEXT,
        tool_call_id TEXT,
        status TEXT NOT NULL CHECK (status IN ('applied', 'unchanged')),
        created_at INTEGER NOT NULL,
        FOREIGN KEY (user_id) REFERENCES users(id),
        FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE SET NULL
      );

      CREATE TABLE IF NOT EXISTS plugin_diary_entries (
        id TEXT PRIMARY KEY,
        user_id INTEGER NOT NULL,
        entry_date TEXT NOT NULL,
        content TEXT NOT NULL DEFAULT '',
        location_text TEXT NOT NULL DEFAULT '',
        weather_code TEXT NOT NULL DEFAULT 'sunny'
          CHECK (weather_code IN (
            'sunny', 'partly_cloudy', 'cloudy', 'fog',
            'light_rain', 'rain', 'thunderstorm', 'snow'
          )),
        mood_code TEXT NOT NULL DEFAULT 'happy'
          CHECK (mood_code IN (
            'happy', 'calm', 'content', 'low', 'irritable', 'tired'
          )),
        is_favorite INTEGER NOT NULL DEFAULT 0 CHECK (is_favorite IN (0, 1)),
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        UNIQUE (user_id, entry_date),
        CHECK (entry_date GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]')
      );

      CREATE TABLE IF NOT EXISTS agent_task_runs (
        id TEXT PRIMARY KEY,
        conversation_id TEXT NOT NULL,
        user_id INTEGER NOT NULL,
        goal TEXT NOT NULL,
        status TEXT NOT NULL CHECK (status IN (
          'running', 'waiting_user', 'waiting_confirmation', 'completed', 'failed', 'cancelled'
        )),
        active_agent_id TEXT,
        context_json TEXT NOT NULL DEFAULT '{}',
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL,
        FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS agent_task_steps (
        id TEXT PRIMARY KEY,
        task_run_id TEXT NOT NULL,
        agent_id TEXT NOT NULL,
        operation TEXT NOT NULL,
        status TEXT NOT NULL CHECK (status IN ('running', 'completed', 'needs_input', 'needs_confirmation', 'failed')),
        input_json TEXT NOT NULL,
        output_json TEXT NOT NULL DEFAULT '{}',
        created_at INTEGER NOT NULL,
        completed_at INTEGER,
        FOREIGN KEY (task_run_id) REFERENCES agent_task_runs(id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS conversation_message_actions (
        id TEXT PRIMARY KEY,
        message_id TEXT NOT NULL,
        position INTEGER NOT NULL,
        payload_json TEXT NOT NULL,
        created_at INTEGER NOT NULL,
        FOREIGN KEY (message_id) REFERENCES conversation_memories(id) ON DELETE CASCADE,
        UNIQUE (message_id, position)
      );

      CREATE TABLE IF NOT EXISTS plugin_permission_grants (
        plugin_id TEXT NOT NULL,
        user_id INTEGER NOT NULL,
        permission TEXT NOT NULL,
        granted_at INTEGER NOT NULL,
        PRIMARY KEY (plugin_id, user_id, permission),
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS plugin_storage (
        plugin_id TEXT NOT NULL,
        user_id INTEGER NOT NULL,
        storage_key TEXT NOT NULL,
        value_json TEXT NOT NULL,
        updated_at INTEGER NOT NULL,
        PRIMARY KEY (plugin_id, user_id, storage_key),
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      );

      CREATE INDEX IF NOT EXISTS idx_conversations_updated_at
        ON conversations(updated_at DESC);

      ${
        currentVersion.user_version === 1
          ? 'ALTER TABLE conversations ADD COLUMN is_pinned INTEGER NOT NULL DEFAULT 0;'
          : ''
      }

      ${
        currentVersion.user_version === 4
          ? `ALTER TABLE user_profile_change_logs ADD COLUMN tool_name TEXT;
             UPDATE user_profile_change_logs
             SET tool_name = 'update_preferred_name'
             WHERE source = 'ai_tool' AND field_name = 'preferred_name';`
          : ''
      }

      ${
        currentVersion.user_version > 0 && currentVersion.user_version < 6
          ? 'ALTER TABLE conversations ADD COLUMN is_archived INTEGER NOT NULL DEFAULT 0;'
          : ''
      }

      ${
        currentVersion.user_version > 0 && currentVersion.user_version < 7
          ? `ALTER TABLE conversation_memories ADD COLUMN created_at INTEGER;
             UPDATE conversation_memories AS memory
             SET created_time = (
                   SELECT conversation_date FROM conversations WHERE id = memory.conversation_id
                 ) || ' ' || memory.created_time,
                 created_at = CAST(strftime('%s', (
                   SELECT conversation_date FROM conversations WHERE id = memory.conversation_id
                 ) || ' ' || memory.created_time) AS INTEGER) * 1000
             WHERE created_at IS NULL;`
          : ''
      }

      ${
        currentVersion.user_version > 0 && currentVersion.user_version < 11
          ? `INSERT OR IGNORE INTO plugin_diary_entries (
               id, user_id, entry_date, content, location_text, weather_code,
               mood_code, is_favorite, created_at, updated_at
             )
             SELECT id, user_id, entry_date, content, location_text, weather_code,
                    mood_code, is_favorite, created_at, updated_at
             FROM diary_entries;
             DROP TABLE diary_entries;`
          : ''
      }

      CREATE INDEX IF NOT EXISTS idx_conversations_pinned_updated_at
        ON conversations(is_pinned DESC, updated_at DESC);

      CREATE INDEX IF NOT EXISTS idx_conversations_active_pinned_updated_at
        ON conversations(creator_id, is_archived, is_pinned DESC, updated_at DESC);

      CREATE INDEX IF NOT EXISTS idx_conversation_memories_conversation_time
        ON conversation_memories(conversation_id, created_time DESC);

      CREATE INDEX IF NOT EXISTS idx_conversation_memories_conversation_created_at
        ON conversation_memories(conversation_id, created_at DESC);

      CREATE INDEX IF NOT EXISTS idx_user_profile_change_logs_user_created
        ON user_profile_change_logs(user_id, created_at DESC);

      CREATE INDEX IF NOT EXISTS idx_plugin_diary_entries_user_date
        ON plugin_diary_entries(user_id, entry_date DESC);

      CREATE INDEX IF NOT EXISTS idx_plugin_diary_entries_user_favorite_date
        ON plugin_diary_entries(user_id, is_favorite, entry_date DESC);

      CREATE INDEX IF NOT EXISTS idx_agent_task_runs_conversation_updated
        ON agent_task_runs(conversation_id, updated_at DESC);

      CREATE INDEX IF NOT EXISTS idx_agent_task_steps_run_created
        ON agent_task_steps(task_run_id, created_at ASC);

      CREATE INDEX IF NOT EXISTS idx_conversation_message_actions_message_position
        ON conversation_message_actions(message_id, position ASC);

      CREATE INDEX IF NOT EXISTS idx_plugin_storage_plugin_user_updated
        ON plugin_storage(plugin_id, user_id, updated_at DESC);

      CREATE UNIQUE INDEX IF NOT EXISTS idx_users_only_one_active
        ON users(is_active) WHERE is_active = 1;

      PRAGMA user_version = ${DATABASE_SCHEMA_VERSION};
      COMMIT;
    `)
  } catch (error) {
    try {
      connection.exec('ROLLBACK;')
    } catch {
      // The transaction may not have started yet.
    }
    throw error
  }
}

const getDefaultDatabaseDirectory = (): string =>
  join(app.getPath('userData'), DATABASE_DIRECTORY_NAME)

const getStorageSettingsPath = (): string =>
  join(app.getPath('userData'), STORAGE_SETTINGS_FILE_NAME)

const getConfiguredDatabaseDirectory = (): string | undefined => {
  const settingsPath = getStorageSettingsPath()
  if (!existsSync(settingsPath)) return undefined

  try {
    const settings = JSON.parse(readFileSync(settingsPath, 'utf8')) as StorageSettings
    if (typeof settings.databaseDirectory === 'string' && isAbsolute(settings.databaseDirectory)) {
      return resolve(settings.databaseDirectory)
    }
  } catch {
    // An invalid local settings file falls back to the safe default location.
  }

  return undefined
}

const saveDatabaseDirectory = (directory: string): void => {
  const defaultDirectory = getDefaultDatabaseDirectory()
  const settingsPath = getStorageSettingsPath()

  if (directory === defaultDirectory) {
    rmSync(settingsPath, { force: true })
    return
  }

  mkdirSync(app.getPath('userData'), { recursive: true })
  writeFileSync(settingsPath, JSON.stringify({ databaseDirectory: directory }, null, 2), 'utf8')
}

export const getDatabaseLocation = (): DatabaseLocation => {
  const defaultDirectory = getDefaultDatabaseDirectory()
  const directory = getConfiguredDatabaseDirectory() ?? defaultDirectory

  return {
    directory,
    databasePath: join(directory, DATABASE_FILE_NAME),
    isDefault: directory === defaultDirectory
  }
}

export const getDatabasePath = (): string => {
  return getDatabaseLocation().databasePath
}

export const initializeDatabase = (): DatabaseSync => {
  if (database) return database

  const { directory, databasePath } = getDatabaseLocation()
  mkdirSync(directory, { recursive: true })

  const connection = new DatabaseSync(databasePath)

  try {
    connection.exec('PRAGMA foreign_keys = ON;')
    connection.exec('PRAGMA journal_mode = WAL;')
    connection.exec('PRAGMA busy_timeout = 5000;')
    applySchema(connection)
    database = connection
    return connection
  } catch (error) {
    connection.close()
    throw error
  }
}

export const getDatabase = (): DatabaseSync => initializeDatabase()

export const closeDatabase = (): void => {
  database?.close()
  database = undefined
}

const verifyDatabase = (databasePath: string): void => {
  const connection = new DatabaseSync(databasePath)

  try {
    const result = connection.prepare('PRAGMA integrity_check').get() as unknown as {
      integrity_check: string
    }
    if (result.integrity_check !== 'ok') {
      throw new Error(`新数据库校验失败：${result.integrity_check}`)
    }
  } finally {
    connection.close()
  }
}

const removeDatabaseFiles = (databasePath: string): void => {
  rmSync(databasePath, { force: true })
  rmSync(`${databasePath}-wal`, { force: true })
  rmSync(`${databasePath}-shm`, { force: true })
}

export const migrateDatabaseDirectory = (targetDirectory: string): DatabaseLocation => {
  if (!isAbsolute(targetDirectory)) throw new Error('数据目录必须使用绝对路径。')

  const source = getDatabaseLocation()
  const destinationDirectory = resolve(targetDirectory)
  if (source.directory === destinationDirectory) return source

  const destinationPath = join(destinationDirectory, DATABASE_FILE_NAME)
  if (existsSync(destinationPath)) {
    throw new Error('目标目录中已存在 ke.sqlite，请选择空目录或先移走该文件。')
  }

  const sourceDirectory = source.directory
  const sourcePath = source.databasePath
  const sourceConnection = initializeDatabase()
  sourceConnection.exec('PRAGMA wal_checkpoint(TRUNCATE);')
  closeDatabase()

  try {
    mkdirSync(destinationDirectory, { recursive: true })
    copyFileSync(sourcePath, destinationPath)
    verifyDatabase(destinationPath)
    saveDatabaseDirectory(destinationDirectory)
    initializeDatabase()
  } catch (error) {
    saveDatabaseDirectory(sourceDirectory)
    removeDatabaseFiles(destinationPath)
    initializeDatabase()
    throw error
  }

  removeDatabaseFiles(sourcePath)
  try {
    rmdirSync(sourceDirectory)
  } catch {
    // The old directory may contain user files. Only this app's database files are removed.
  }

  return getDatabaseLocation()
}
