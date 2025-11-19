import { pgTable, uuid, varchar, integer, boolean, timestamp } from 'drizzle-orm/pg-core';
import { villages } from './villages.schema';

export const buildings = pgTable('buildings', {
  id: uuid('id').defaultRandom().primaryKey(),
  villageId: uuid('village_id')
    .notNull()
    .references(() => villages.id, { onDelete: 'cascade' }),
  type: varchar('type', { length: 50 }).notNull(), // town_hall, gold_mine, elixir_collector, etc.
  level: integer('level').default(1).notNull(),
  positionX: integer('position_x').notNull(),
  positionY: integer('position_y').notNull(),
  health: integer('health').notNull(),
  maxHealth: integer('max_health').notNull(),
  isActive: boolean('is_active').default(true).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export type Building = typeof buildings.$inferSelect;
export type NewBuilding = typeof buildings.$inferInsert;
