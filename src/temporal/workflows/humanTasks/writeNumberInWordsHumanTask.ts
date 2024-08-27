import {
  ApplicationFailure,
  executeChild,
  uuid4,
  workflowInfo,
} from "@temporalio/workflow";
import { WriteNumberInWords } from "../../../types";
import { humanTask } from "../humanTask";

/**
 * This is a wrapper around a call to the humanTask workflow.
 *
 * @param input The input to the workflow
 * @returns The output of the workflow
 */
export async function writeNumberInWordsHumanTask(
  input: WriteNumberInWords["input"]
): Promise<WriteNumberInWords["output"]> {
  if (input.number < 0 || input.number > 9) {
    throw new ApplicationFailure(`Invalid number: ${input.number}`);
  }

  const humanTaskResult = await executeChild(humanTask<WriteNumberInWords>, {
    workflowId: `humanTask-${
      workflowInfo().workflowId
    }-write-number-in-words-${uuid4()}`,
    workflowRunTimeout: "7d",
    args: ["write-number-in-words", input],
  });

  const { text } = humanTaskResult;
  const lcText = text.toLowerCase();

  if (
    [
      "zero",
      "one",
      "two",
      "three",
      "four",
      "five",
      "six",
      "seven",
      "eight",
      "nine",
    ].indexOf(lcText) === -1
  ) {
    throw new ApplicationFailure(
      `Invalid number word for ${input.number}: ${text}`
    );
  }

  return humanTaskResult;
}
