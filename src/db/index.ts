import {
  FileMigrationProvider,
  Generated,
  Insertable,
  Migrator,
  Selectable,
  Updateable,
} from "kysely";
import SQLite from "better-sqlite3";
import { Kysely, SqliteDialect } from "kysely";
import path from "path";
import { promises as fs } from "fs";
import { TaskStatus } from "../types";

interface TaskTable {
  id: Generated<bigint>;
  type: string;
  input: Buffer;
  output?: Buffer;
  assignee?: string;
  status: Generated<TaskStatus>;
  heartbeat?: Date;
}

type Task = Selectable<TaskTable>;
type NewTask = Insertable<TaskTable>;
type TaskUpdate = Updateable<TaskTable>;

interface Database {
  tasks: TaskTable;
}

let dbCache: Kysely<Database> | undefined;
export async function getDb() {
  if (!dbCache) {
    dbCache = new Kysely<Database>({
      dialect: new SqliteDialect({
        database: new SQLite("/tmp/tasks.db"),
      }),
    });

    const migrator = new Migrator({
      db: dbCache,
      provider: new FileMigrationProvider({
        fs,
        path,
        migrationFolder: path.join(__dirname, "migrations"),
      }),
    });

    const { error, results } = await migrator.migrateToLatest();

    results?.forEach((it) => {
      if (it.status === "Success") {
        console.log(
          `migration "${it.migrationName}" was executed successfully`
        );
      } else if (it.status === "Error") {
        console.error(`failed to execute migration "${it.migrationName}"`);
      }
    });

    if (error) {
      console.error("failed to execute migrations");
      console.error(error);
      process.exit(1);
    }
  }

  const db = dbCache!;

  const getTask = async (id: bigint): Promise<Task> => {
    const task = await db
      .selectFrom("tasks")
      .select([
        "id",
        "input",
        "output",
        "type",
        "assignee",
        "status",
        "heartbeat",
      ])
      .where("id", "=", id)
      .executeTakeFirst();

    if (!task) throw new Error("failed to fetch task");

    return task;
  };

  const addTask = async (newTask: NewTask): Promise<Task> => {
    const result = await db
      .insertInto("tasks")
      .values(newTask)
      .executeTakeFirst();

    if (!result || !result.insertId) throw new Error("failed to insert task");

    return getTask(result.insertId);
  };

  const startTask = async (assignee: string): Promise<Task> => {
    return await db.transaction().execute(async () => {
      const task = await db
        .selectFrom("tasks")
        .select(["id"])
        .where((eb) =>
          eb.or([
            eb("status", "=", TaskStatus.NOT_STARTED),
            eb("heartbeat", "=", null),
            eb(
              "heartbeat",
              "<",
              new Date(new Date().valueOf() - 1000 * 60 * 5)
            ),
          ])
        )
        .executeTakeFirst();
      if (!task) throw new Error("no tasks available");

      const update = db
        .updateTable("tasks")
        .set("status", TaskStatus.IN_PROGRESS)
        .set("assignee", assignee)
        .set("heartbeat", new Date())
        .where("id", "=", task.id);

      const result = await update.execute();
      if (!result) throw new Error("failed to update task");

      return getTask(task.id);
    });
  };

  const heartbeatTask = (id: bigint): Promise<Task> => {
    return db.transaction().execute(async () => {
      const task = await getTask(id);
      if (task.status !== TaskStatus.IN_PROGRESS)
        throw new Error("not started");

      const update = db
        .updateTable("tasks")
        .set("heartbeat", new Date())
        .where("id", "=", id);

      const result = await update.execute();
      if (!result) throw new Error("failed to update task");

      return getTask(id);
    });
  };

  const completeTask = (id: bigint, output: Buffer): Promise<Task> => {
    return db.transaction().execute(async () => {
      const task = await getTask(id);
      if (task.status !== TaskStatus.IN_PROGRESS)
        throw new Error("not started");

      const update = db
        .updateTable("tasks")
        .set("status", TaskStatus.COMPLETED)
        .set("output", output)
        .where("id", "=", id);

      const result = await update.execute();
      if (!result) throw new Error("failed to update task");

      return getTask(id);
    });
  };

  return {
    getTask,
    addTask,
    startTask,
    heartbeatTask,
    completeTask,
  };
}
