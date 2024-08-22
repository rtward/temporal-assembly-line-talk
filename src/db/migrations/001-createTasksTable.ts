import { Kysely, sql } from "kysely";

export async function up(db: Kysely<any>): Promise<void> {
  await db.schema
    .createTable("tasks")
    .addColumn("id", "varchar(256)", (col) => col.primaryKey())
    .addColumn("type", "varchar(16)", (col) => col.notNull())
    .addColumn("input", "jsonb", (col) => col.notNull())
    .addColumn("output", "jsonb")
    .addColumn("assignee", "varchar(64)")
    .addColumn("status", "varchar(16)", (col) =>
      col.notNull().defaultTo("not-started")
    )
    .addColumn("heartbeat", "timestamp")
    .execute();
}

export async function down(db: Kysely<any>): Promise<void> {
  await db.schema.dropTable("tasks");
}
