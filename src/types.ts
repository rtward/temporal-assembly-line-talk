import { defineSignal } from "@temporalio/workflow";

export interface HumanTaskBase {
  type: string;
  input: Record<string, unknown>;
  output: Record<string, unknown>;
}

export interface AddDigitsHumanTask extends HumanTaskBase {
  type: "add-digits";
  input: { digits: number[] };
  output: { sum: number };
}

export interface WriteNumberInWords extends HumanTaskBase {
  type: "write-number-in-words";
  input: { number: number };
  output: { text: string };
}

export type HumanTask = AddDigitsHumanTask | WriteNumberInWords;

type HumanTaskCompletedSignalSuccessPayload = {
  success: true;
  output: Record<string, unknown>;
};
type HumanTaskCompletedSignalFailurePayload = { success: false; error: Error };
export type HumanTaskCompletedSignalPayload =
  | HumanTaskCompletedSignalSuccessPayload
  | HumanTaskCompletedSignalFailurePayload;

export const humanTaskCompletedSignal =
  defineSignal<[HumanTaskCompletedSignalPayload]>("humanTaskCompleted");

export const subscribeToHumanTaskCompletedSignal = defineSignal<[string]>(
  "subscribeToHumanTaskCompleted"
);

export enum TaskStatus {
  NOT_STARTED = "not-started",
  IN_PROGRESS = "started",
  COMPLETED = "completed",
}
