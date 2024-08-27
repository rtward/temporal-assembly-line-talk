import { proxyActivities } from "@temporalio/workflow";
import type * as activities from "../activities";
import { writeNumberInWordsHumanTask } from "./humanTasks/writeNumberInWordsHumanTask";

const { getDigitsFromString } = proxyActivities<typeof activities>({
  startToCloseTimeout: "10m",
  retry: { maximumAttempts: 3 },
});

/**
 * This is a contrived example of a workflow that uses parallel human tasks.
 *
 * The task separates the digits from a string and then asks a human to write each digit words,
 * then combines the results into a single string.
 *
 * @param input The input to the workflow
 */
export async function writeDigitsInWords(input: string): Promise<string> {
  const digits = await getDigitsFromString(input);

  const digitWords = await Promise.all(
    digits.map((number) => writeNumberInWordsHumanTask({ number }))
  );

  return digitWords.map((output) => output.text).join(" ");
}
