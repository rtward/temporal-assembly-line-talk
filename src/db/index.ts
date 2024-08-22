import {
  FileMigrationProvider,
  Generated,
  Insertable,
  Migrator,
  Selectable,
  Transaction,
  Updateable,
} from "kysely";
import SQLite from "better-sqlite3";
import { Kysely, SqliteDialect } from "kysely";
import path from "path";
import { promises as fs } from "fs";
import { TaskStatus } from "../types";

interface TaskTable {
  id: string;
  type: string;
  input: string;
  output?: string;
  assignee?: string;
  status: Generated<`${TaskStatus}`>;
  heartbeat?: string;
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

    console.log("Database is ready");
  }

  const db = dbCache!;

  const getTask = async (
    id: string,
    txn?: Transaction<Database>
  ): Promise<Task> => {
    const txnOrDb = txn || db;

    const task = await txnOrDb
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

    task.input = JSON.parse(task.input);
    task.output = task.output ? JSON.parse(task.output) : undefined;

    return task;
  };

  const addTask = async (newTask: NewTask): Promise<Task> => {
    const result = await db
      .insertInto("tasks")
      .values(newTask)
      .executeTakeFirst();
    if (!result) throw new Error("failed to insert task");

    return getTask(newTask.id);
  };

  const startTask = async (assignee: string): Promise<Task> => {
    return await db.transaction().execute(async (txn) => {
      const task = await txn
        .selectFrom("tasks")
        .select(["id"])
        .where((eb) =>
          eb.or([
            eb("status", "=", TaskStatus.NOT_STARTED),
            eb("heartbeat", "=", null),
            eb(
              "heartbeat",
              "<",
              new Date(new Date().valueOf() - 1000 * 60 * 5).toISOString()
            ),
          ])
        )
        .executeTakeFirst();
      if (!task) throw new Error("no tasks available");

      const result = txn
        .updateTable("tasks")
        .set("status", TaskStatus.IN_PROGRESS)
        .set("assignee", assignee)
        .set("heartbeat", new Date().toISOString())
        .where("id", "=", task.id)
        .execute();
      if (!result) throw new Error("failed to update task");

      return getTask(task.id, txn);
    });
  };

  const heartbeatTask = (id: string): Promise<Task> => {
    return db.transaction().execute(async (txn) => {
      const task = await getTask(id, txn);
      if (task.status !== TaskStatus.IN_PROGRESS)
        throw new Error("not started");

      const update = txn
        .updateTable("tasks")
        .set("heartbeat", new Date().toISOString())
        .where("id", "=", id);

      const result = await update.execute();
      if (!result) throw new Error("failed to update task");

      return getTask(id, txn);
    });
  };

  const completeTask = (
    id: string,
    output: Record<string, any>
  ): Promise<Task> => {
    return db.transaction().execute(async (txn) => {
      const task = await getTask(id, txn);
      if (task.status !== TaskStatus.IN_PROGRESS)
        throw new Error("not started");

      const update = txn
        .updateTable("tasks")
        .set("status", TaskStatus.COMPLETED)
        .set("output", JSON.stringify(output))
        .where("id", "=", id);

      const result = await update.execute();
      if (!result) throw new Error("failed to update task");

      return getTask(id, txn);
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

// Call onece to instantiate the database on startup
getDb();
