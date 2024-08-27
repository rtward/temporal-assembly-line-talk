import {
  ApplicationFailure,
  condition,
  log,
  proxyActivities,
  setHandler,
} from "@temporalio/workflow";
import {
  HumanTask,
  humanTaskCompletedSignal,
  HumanTaskCompletedSignalPayload,
} from "../../types";

import type * as activities from "../activities";

const { signalWithStartHumanTask } = proxyActivities<typeof activities>({
  startToCloseTimeout: "10m",
  retry: { maximumAttempts: 3 },
});

/**
 * The generic human task workflow, this workflow should be called by a helper workflow function.
 *
 * This workflow is the entry point called by other workflows that need to perform a human task.
 * This workflow will return a memoized result if one is available, otherwise it will perform a
 * signalWithStartHumanTask to either signal an in-progress doHumanTask workflow or start a new one.
 *
 * @param input The input to the human task
 * @returns The output of the human task
 */
export async function humanTask<Task extends HumanTask>(
  type: Task["type"],
  input: Task["input"]
): Promise<Task["output"]> {
  let result: HumanTaskCompletedSignalPayload | undefined;
  setHandler(humanTaskCompletedSignal, (paylaod) => {
    log.info(
      `humanTask: Received humanTaskCompletedSignal signal - ${JSON.stringify(
        paylaod
      )}`
    );
    result = paylaod;
  });

  await signalWithStartHumanTask(type, input);

  log.info("humanTask: Waiting for humanTaskCompletedSignal");
  await condition(() => result !== undefined);
  log.info(
    `humanTask: Human task completed with result ${JSON.stringify(result)}`
  );

  // This should probably have type validation here to ensure that we are returning the correct type
  if (result!.success) return result!.output as Task["output"];
  else throw ApplicationFailure.fromError(result!.error);
}
