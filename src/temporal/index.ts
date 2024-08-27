import { Worker } from "@temporalio/worker";
import path from "node:path";

import * as activities from "./activities";

Promise.resolve()
  .then(async () => {
    const worker = await Worker.create({
      taskQueue: "default",
      activities,
      workflowsPath: path.join(__dirname, "./workflows"),
    });

    await worker.run();
  })
  .catch((err) => {
    console.error("error running temporal worker");
    console.error(err);
    process.exit(1);
  });
