import { Client } from "@temporalio/client";
import {
  humanTaskCompletedSignal,
  HumanTaskCompletedSignalPayload,
} from "../../types";
import { Context } from "@temporalio/activity";

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
