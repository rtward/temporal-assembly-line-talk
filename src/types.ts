import { defineSignal } from "@temporalio/workflow";

type HumanTaskCompletedSignalSuccessPayload = { success: true; output: number };
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
