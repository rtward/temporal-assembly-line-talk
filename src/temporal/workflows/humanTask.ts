import { condition, proxyActivities, setHandler } from "@temporalio/workflow";
import {
  humanTaskCompletedSignal,
  HumanTaskCompletedSignalPayload,
} from "../../types";

import type * as activities from "../activities";

const { signalWithStartHumanTask } = proxyActivities<typeof activities>({
  startToCloseTimeout: "10m",
  retry: { maximumAttempts: 3 },
});

export async function humanTask(input: number[]): Promise<number> {
  let result: HumanTaskCompletedSignalPayload | undefined;
  setHandler(humanTaskCompletedSignal, (paylaod) => {
    result = paylaod;
  });

  await signalWithStartHumanTask(input);

  await condition(() => result !== undefined);

  if (result!.success) return result!.output;
  else throw result!.error;
}
