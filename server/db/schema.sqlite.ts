import { integer, sqliteTable, text } from 'drizzle-orm/sqlite-core'

export const messages = sqliteTable('messages', {
  id: integer().primaryKey({ autoIncrement: true }),
  text: text().notNull(),
  createdAt: integer('created_at').notNull(),
})

export const users = sqliteTable('users', {
  id: integer().primaryKey({ autoIncrement: true }),
  githubId: text('github_id').unique().notNull(),
  username: text().notNull(),
  avatarUrl: text('avatar_url'),
  createdAt: integer('created_at').notNull(),
})
