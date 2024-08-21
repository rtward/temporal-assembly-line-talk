import { Context } from "@temporalio/activity";
import { doHumanTask } from "../workflows";
import { subscribeToHumanTaskCompletedSignal } from "../../types";

function getDeterministicWorkflowId(input: number[]) {
  return `doHumanTaskForInput-${input.join(",")}`;
}

export async function signalWithStartHumanTask(input: number[]) {
  const workflowId = getDeterministicWorkflowId(input);
  const ctx = await Context.current();

  await client.workflow.signalWithStart(doHumanTask, {
    workflowId,
    workflowRunTimeout: "7d",
    taskQueue: ctx.info.taskQueue,
    args: [input],
    signal: subscribeToHumanTaskCompletedSignal,
    signalArgs: [{ workflowId: ctx.info.workflowExecution.workflowId }],
  });
}
