import {
  ApplicationFailure,
  executeChild,
  uuid4,
  workflowInfo,
} from "@temporalio/workflow";
import { humanTask } from "../humanTask";
import { AddDigitsHumanTask } from "../../../types";

/**
 * This is a wrapper around a call to the humanTask workflow.
 *
 * @param input The input to the workflow
 * @returns The output of the workflow
 */
export async function addDigitsHumanTask(
  input: AddDigitsHumanTask["input"]
): Promise<AddDigitsHumanTask["output"]> {
  const humanTaskResult = await executeChild(humanTask<AddDigitsHumanTask>, {
    workflowId: `humanTask-${workflowInfo().workflowId}-add-digits-${uuid4()}`,
    workflowRunTimeout: "7d",
    args: ["add-digits", input],
  });

  const sum = input.digits.reduce((acc, digit) => acc + digit, 0);
  if (sum !== humanTaskResult.sum) {
    throw new ApplicationFailure(
      `Invalid sum for ${input.digits}: ${humanTaskResult.sum}`
    );
  }

  return humanTaskResult;
}
