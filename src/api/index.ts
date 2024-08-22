import express from "express";
import { getDb } from "../db";
import bodyParser from "body-parser";

const app = express();
const port = process.env.PORT || 3000;

// Start a task
app.post("/start", (req, res) =>
  Promise.resolve()
    .then(async () => {
      const assignee = req.query.assignee;

      if (!assignee) throw new Error("assignee is required");
      if (typeof assignee !== "string")
        throw new Error("assignee must be a string");

      const db = await getDb();
      const task = await db.startTask(assignee);
      return res.json(task);
    })
    .catch((err) => res.status(500).send(`error: ${err.message}`))
);

// Heartbeat a task
app.post("/heartbeat/:taskId", (req, res) =>
  Promise.resolve()
    .then(async () => {
      const taskId = req.params.taskId;
      if (!taskId) throw new Error("taskId is required");
      if (typeof taskId !== "string")
        throw new Error("taskId must be a string");

      const db = await getDb();
      const task = await db.heartbeatTask(taskId);
      return res.json(task);
    })
    .catch((err) => res.status(500).send(`error: ${err.message}`))
);

// Complete a task
app.post("/complete/:taskId", bodyParser.json(), (req, res) =>
  Promise.resolve()
    .then(async () => {
      const taskId = req.params.taskId;
      if (!taskId) throw new Error("taskId is required");
      if (typeof taskId !== "string")
        throw new Error("taskId must be a string");

      const result = req.body;
      console.dir(result);

      const db = await getDb();
      const task = await db.completeTask(taskId, result);
      // TODO Signal the workflow that the task has been completed
      return res.json(task);
    })
    .catch((err) => res.status(500).send(`error: ${err.message}`))
);

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
