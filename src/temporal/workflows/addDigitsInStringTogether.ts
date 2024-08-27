import { proxyActivities } from "@temporalio/workflow";
import type * as activities from "../activities";
import { addDigitsHumanTask } from "./humanTasks/addDigitsHumanTask";

const { getDigitsFromString, doubleNumber } = proxyActivities<
  typeof activities
>({
  startToCloseTimeout: "10m",
  retry: { maximumAttempts: 3 },
});

/**
 * This is a contrived example of a workflow that uses a human task.
 *
 * @param input The input to the workflow
 */
export async function addDigitsInStringTogether(
  input: string
): Promise<number> {
  const digits = await getDigitsFromString(input);

  const humanTaskResult = await addDigitsHumanTask({ digits });

  return doubleNumber(humanTaskResult.sum);
}
