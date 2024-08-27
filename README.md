# Building Assembly Lines in Temporal

This is the sample code for a talk given at (Temporal Replay 2024)[https://replay.temporal.io/] called "Building Assembly Lines in Temporal". The slides for the talk are included in `talk.{pptx,pdf}`.

The goal of this talk is to show off a system for integrating human tasks seamlessly into a Temporal workflow.  The sample code is a simplified version of the one built internally by Juristat to help power our workflow automation products.

This sample code is built in Typescript and uses a Sqlite DB as a persistence layer.  You'll need to have a recent version of node installed as well as `pnpm` for node.

## Running the example workflow

### Setting up

Install the dependencies
```
pnpm install
```

(Install the Temporal CLI)[https://docs.temporal.io/cli]

### Starting all the services

 - Start the Temporal server: `temporal server start-dev`
 - Start the Tempral worker: `pnpm worker`
 - Start the API: `pnpm api`

### Submit a workflow

Submit a first workflow
```
temporal workflow execute --task-queue default --workflow-id test-1 --input '"137"' --type myWorkflow
```

Submit a second workflow with identical input to test task deduplication
```
temporal workflow execute --task-queue default --workflow-id test-2 --input '"137"' --type myWorkflow
```

See how there are two tasks for the `humanTask` workflow, but only a single `doHumanTask` workflow.

### Perform the human task

 - Start the task: `curl -XPOST localhost:3000/start`
 - Heartbeat the task: `curl -XPOST localhost:3000/heartbeat/:task-id`
 - Complete the task: `curl -XPOST --json '{"task": "payload"}' localhost:3000/complete/:task-id`
 
 Notice that both of the workflows submitted earlier are now complete, but only one task was performed.
 
 ### Submit another task

Submit a third task to test memoization.
```
temporal workflow execute --task-queue default --workflow-id test-3 --input '"137"' --type myWorkflow
```

See that the workflow returns immediately because it fetches the result from the DB and bypasses creating another task.
