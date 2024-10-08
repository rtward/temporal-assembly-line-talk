import { Context } from "@temporalio/activity";
import { Client } from "@temporalio/client";
import { doHumanTask } from "../workflows";
import {
  HumanTask,
  humanTaskCompletedSignal,
  subscribeToHumanTaskCompletedSignal,
} from "../../types";
import { TasksDb } from "../../db";
import crypto from "crypto";

/**
 * Given an input, return a deterministic workflow ID that can be used for memoization.
 *
 * @param input The task input
 * @returns A deterministic workflow ID based on the input
 */
function getDeterministicWorkflowId(
  type: string,
  input: Record<string, unknown>
) {
  const hash = crypto
    .createHash("md5")
    .update(JSON.stringify(input))
    .digest("hex");
  return `doHumanTask-${type}-${hash}`;
}

/**
 * If the human task is already completed, signal the workflow with the result. Otherwise,
 * perform a `signalWithStart` to either signal an in-progress `doHumanTask` workflow or
 * start a new one.
 *
 * @param input The input to the human task
 */
export async function signalWithStartHumanTask<Task extends HumanTask>(
  type: Task["type"],
  input: Task["input"]
) {
  const ctx = await Context.current();
  const db = await TasksDb.getInstance();
  const client = new Client();

  const workflowId = getDeterministicWorkflowId(type, input);
  ctx.log.info(`signalWithStartHumanTask: Using workflow ID ${workflowId}`);

  // If the task is already completed, signal the workflow with the result
  const task = await db.getTask(workflowId).catch(() => undefined);
  if (task && task.status === "completed") {
    ctx.log.info(
      `signalWithStartHumanTask: Task ${workflowId} has already been completed, returning output ${task.output}`
    );
    client.workflow
      .getHandle(ctx.info.workflowExecution.workflowId)
      .signal(humanTaskCompletedSignal, {
        success: true,
        output: JSON.parse(task.output ?? "{}"),
      });
    return;
  }

  // Otherwise, signal the workflow to start the human task
  ctx.log.info(
    `signalWithStartHumanTask: doing signalWithStart for workflow ${workflowId}`
  );
  await client.workflow.signalWithStart(doHumanTask, {
    workflowId,
    workflowRunTimeout: "7d",
    taskQueue: ctx.info.taskQueue,
    args: [type, input],
    signal: subscribeToHumanTaskCompletedSignal,
    signalArgs: [ctx.info.workflowExecution.workflowId],
  });
}
