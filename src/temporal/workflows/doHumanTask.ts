import {
  CancellationScope,
  condition,
  log,
  proxyActivities,
  setHandler,
} from "@temporalio/workflow";
import {
  HumanTask,
  humanTaskCompletedSignal,
  HumanTaskCompletedSignalPayload,
  subscribeToHumanTaskCompletedSignal,
} from "../../types";
import type * as activities from "../activities";

const { submitTask, signalHumanTaskComplete } = proxyActivities<
  typeof activities
>({
  startToCloseTimeout: "10m",
  retry: { maximumAttempts: 3 },
});

/**
 * Actually perform the human task.  This workflow should only ever be called by a signalWithStart
 * from a `humanTask` workflow.
 *
 * This workflow accepts signals from other workflows that act as subscriptions to the human task
 * completion signal.  When this workflow receives a signal, it will forward the signal to the
 * subscribed workflows.
 *
 * @param input The input to the human task
 */
export async function doHumanTask<Task extends HumanTask>(
  type: Task["type"],
  input: Task["input"]
) {
  let subscriptions = new Set<string>();
  setHandler(subscribeToHumanTaskCompletedSignal, (workflowId: string) => {
    log.info(`doHumanTask: Subscribing workflow ${workflowId}`);
    subscriptions.add(workflowId);
  });

  let result: HumanTaskCompletedSignalPayload | undefined = undefined;
  setHandler(
    humanTaskCompletedSignal,
    async (paylaod: HumanTaskCompletedSignalPayload) => {
      log.info(
        `doHumanTask: Received humanTaskCompletedSignal signal - ${JSON.stringify(
          paylaod
        )}`
      );
      result = paylaod;
    }
  );

  let error: Error | undefined = undefined;
  try {
    await submitTask(type, input);

    log.info(
      "doHumanTask: Task submitted, waiting for humanTaskCompletedSignal"
    );
    await condition(() => result !== undefined);
    log.info(
      `doHumanTask: Human task completed with result ${JSON.stringify(result)}`
    );
  } catch (err) {
    log.error(`doHumanTask: Failed to submit or wait for task: ${err}`);
    error = err instanceof Error ? err : new Error("Unknown Error");
  } finally {
    log.info(
      `doHumanTask: Signaling ${subscriptions.size} subscribed workflows`
    );

    await CancellationScope.nonCancellable(async () => {
      result = result ?? {
        success: false,
        error: error ?? new Error("Unknown Error"),
      };

      await signalHumanTaskComplete([...subscriptions.values()], result);
    });
  }
}
