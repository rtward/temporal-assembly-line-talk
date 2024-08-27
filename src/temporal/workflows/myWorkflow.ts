import {
  executeChild,
  proxyActivities,
  uuid4,
  workflowInfo,
} from "@temporalio/workflow";
import type * as activities from "../activities";
import { humanTask } from "./humanTask";

const { doActivity, doAnotherActivity } = proxyActivities<typeof activities>({
  startToCloseTimeout: "10m",
  retry: { maximumAttempts: 3 },
});

/**
 * This is a contrived example of a workflow that uses a human task.
 *
 * @param input The input to the workflow
 */
export async function myWorkflow(input: string): Promise<void> {
  const workToHandle = await doActivity(input);

  const humanTaskResult = await executeChild(humanTask, {
    workflowId: `humanTask-${workflowInfo().workflowId}-${uuid4()}`,
    workflowRunTimeout: "7d",
    args: [workToHandle],
  });

  await doAnotherActivity(humanTaskResult);
}
