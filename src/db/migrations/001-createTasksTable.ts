import { Kysely } from "kysely";

export async function up(db: Kysely<any>): Promise<void> {
  await db.schema
    .createTable("tasks")
    .addColumn("id", "varchar(256)", (col) => col.primaryKey())
    .addColumn("type", "varchar(16)", (col) => col.notNull())
    .addColumn("input", "blob", (col) => col.notNull())
    .addColumn("output", "blob")
    .addColumn("assignee", "varchar(64)")
    .addColumn("status", "varchar(16)", (col) =>
      col.notNull().defaultTo("not-started")
    )
    .addColumn("heartbeat", "timestamp");
}

export async function down(db: Kysely<any>): Promise<void> {
  await db.schema.dropTable("tasks");
}
