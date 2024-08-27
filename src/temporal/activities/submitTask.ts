import { workflowInfo } from "@temporalio/workflow";
import { TasksDb } from "../../db";
import { Context } from "@temporalio/activity";
import { HumanTask } from "../../types";

/**
 * Queue a human task for completion in the tasks DB.
 *
 * @param input The input to the human task
 */
export async function submitTask<Task extends HumanTask>(
  type: Task["type"],
  input: Task["input"]
): Promise<void> {
  const ctx = await Context.current();
  const db = await TasksDb.getInstance();
  await db.addTask({
    id: ctx.info.workflowExecution.workflowId,
    type: "human-task",
    input: JSON.stringify(input),
  });
}
