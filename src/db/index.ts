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

/** The schema of the tasks table in the database */
interface TaskTable {
  /** The task ID, also the ID of the temporal workflow to signal on completion */
  id: string;

  /** The task type */
  type: string;

  /** The JSON encoded task input */
  input: string;

  /** The JSON encoded task output */
  output?: string;

  /** The current task assignee */
  assignee?: string;

  /** The current task status */
  status: Generated<`${TaskStatus}`>;

  /** The most recent task heartbeat */
  heartbeat?: string;
}

type Task = Selectable<TaskTable>;
type NewTask = Insertable<TaskTable>;
type TaskUpdate = Updateable<TaskTable>;

interface Database {
  tasks: TaskTable;
}

/**
 * The singleton class representing our database.
 */
export class TasksDb {
  private static instance: TasksDb | undefined;

  /**
   * Instantiates an instance of the TasksDb class if one does not already exist and returns it.
   *
   * @returns The singleton instance of the TasksDb class.
   */
  static async getInstance() {
    if (!this.instance) {
      this.instance = new TasksDb();
      await this.instance.init();
    }
    return this.instance;
  }

  /** The kysely database we use for accessing sqlite */
  private db: Kysely<Database>;

  /** Instantiates a new TasksDb instance */
  private constructor() {
    if (TasksDb.instance) throw new Error("TasksDb is a singleton class");

    this.db = new Kysely<Database>({
      dialect: new SqliteDialect({
        database: new SQLite("/tmp/tasks.db"),
      }),
    });
  }

  /** Applies the Tasks migrations to the database to create the schema */
  private async init() {
    const migrator = new Migrator({
      db: this.db,
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

  /**
   * Get a task by its ID.
   *
   * @param id The ID of the task to fetch
   * @param txn Optionally provide a transaction to use instead of the default database
   * @returns The task with the given ID
   * @throws If the task does not exist
   */
  async getTask(id: string, txn?: Transaction<Database>): Promise<Task> {
    const txnOrDb = txn || this.db;

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
  }

  /**
   * Add a new task to the database.
   *
   * @param newTask The task definition
   * @returns The newly created task
   * @throws If the task could not be created
   */
  async addTask(newTask: NewTask): Promise<Task> {
    const result = await this.db
      .insertInto("tasks")
      .values(newTask)
      .executeTakeFirst();
    if (!result) throw new Error("failed to insert task");

    return this.getTask(newTask.id);
  }

  /**
   * Start the next available task and assign it to a user.
   *
   * @param assignee The user to assign the task
   * @returns The task that was started
   * @throws If no tasks are available
   */
  async startTask(assignee: string): Promise<Task> {
    return await this.db.transaction().execute(async (txn) => {
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

      return this.getTask(task.id, txn);
    });
  }

  /**
   * Heartbeat a task to indicate that it is still in progress.
   *
   * @param id The ID of the task to heartbeat
   * @returns The task that was updated
   */
  async heartbeatTask(id: string): Promise<Task> {
    return this.db.transaction().execute(async (txn) => {
      const task = await this.getTask(id, txn);
      if (task.status !== TaskStatus.IN_PROGRESS)
        throw new Error("not started");

      const update = txn
        .updateTable("tasks")
        .set("heartbeat", new Date().toISOString())
        .where("id", "=", id);

      const result = await update.execute();
      if (!result) throw new Error("failed to update task");

      return this.getTask(id, txn);
    });
  }

  /**
   * Complete a task with the given output.
   *
   * @param id The ID of the task to complete
   * @param output The output of the task
   * @returns The task that was completed
   */
  async completeTask(id: string, output: Record<string, any>): Promise<Task> {
    return this.db.transaction().execute(async (txn) => {
      const task = await this.getTask(id, txn);
      if (task.status !== TaskStatus.IN_PROGRESS)
        throw new Error("not started");

      const update = txn
        .updateTable("tasks")
        .set("status", TaskStatus.COMPLETED)
        .set("output", JSON.stringify(output))
        .where("id", "=", id);

      const result = await update.execute();
      if (!result) throw new Error("failed to update task");

      return this.getTask(id, txn);
    });
  }
}

// Call onece to instantiate the database on startup
TasksDb.getInstance().catch((err) => {
  console.error("failed to initialize database");
  console.error(err);
  process.exit(1);
});
