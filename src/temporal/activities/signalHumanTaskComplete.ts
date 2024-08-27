import { Client } from "@temporalio/client";
import {
  humanTaskCompletedSignal,
  HumanTaskCompletedSignalPayload,
} from "../../types";
import { Context } from "@temporalio/activity";

/**
 * Given a list of subscribed workflow IDs, and a signal payload, signal each subscribed
 * workflow with the payload.
 *
 * This function is fire and forget, and will not throw if there is an error signalling any of
 * the workflows.
 *
 * @param subscriptions The list of subscribed workflow IDs
 * @param payload The payload to send to each subscribed workflow
 */
export async function signalHumanTaskComplete(
  subscriptions: string[],
  payload: HumanTaskCompletedSignalPayload
) {
  const ctx = await Context.current();

  ctx.log.info(
    `doHumanTask: Signaling ${
      subscriptions.length
    } subscribed workflows with ${JSON.stringify(payload)}`
  );

  const client = new Client();

  await Promise.all(
    [...subscriptions.values()].map(async (workflowId) => {
      try {
        ctx.log.info(`doHumanTask: Signaling workflow ${workflowId}`);
        const handle = client.workflow.getHandle(workflowId);
        await handle.signal(humanTaskCompletedSignal, payload);
      } catch (err) {
        ctx.log.error(`Failed to signal workflow ${workflowId}: ${err}`);
      }
    })
  );
}
