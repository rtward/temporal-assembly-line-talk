import express from "express";

const app = express();
const port = process.env.PORT || 3000;

// Health check
app.get("/", (req, res) => {
  res.send(200, "OK");
});

// List tasks
app.get("/list", (req, res) => {});

// Start a task
app.post("/start", (req, res) => {});

// Heartbeat a task
app.post("/heartbeat", (req, res) => {});

// Complete a task
app.post("/complete", (req, res) => {});

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
