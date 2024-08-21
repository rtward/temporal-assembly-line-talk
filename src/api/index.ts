import express from "express";
import { getDb } from "../db";

const app = express();
const port = process.env.PORT || 3000;

const db = await getDb();

// Start a task
app.post("/start", (req, res) => {
  Promise.resolve()
    .then(async () => {
      const assignee = req.query.assignee;
      if (!assignee) throw new Error("assignee is required");

      const task = await db.startTask(assignee);
      return res.json(task);
    })
    .catch((err) => res.status(500).send("error"));
});

// Heartbeat a task
app.post("/heartbeat/:taskId", (req, res) =>
  Promise.resolve()
    .then(async () => {
      const taskId = BigInt(req.params.taskId);
      const task = await db.heartbeatTask(taskId);
      return res.json(task);
    })
    .catch((err) => res.status(500).send("error"))
);

// Complete a task
app.post("/complete/:taskId", (req, res) =>
  Promise.resolve()
    .then(async () => {
      const taskId = BigInt(req.params.taskId);
      const result = req.body;
      const task = await db.completeTask(taskId, result);
      // TODO Signal the workflow that the task has been completed
      return res.json(task);
    })
    .catch((err) => res.status(500).send("error"))
);

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
