# Building Assembly Lines in Temporal

## Running the example workflow

### Setting up

```
pnpm install
```

### Start the API

```
TEMPORAL_ENVS ...
pnpm api
```

### Start the Worker

```
TEMPORAL_ENVS ...
pnpm worker
```

### Submit a workflow

```
temporal workflow start ...
```

### Start the task

```
curl -XPOST localhost:3000/start
```

### Heartbeat the task

```
curl -XPOST localhost:3000/heartbeat/:task-id
```

### Complete the task

```
curl -XPOST --json '{"task": "payload"}' localhost:3000/complete/:task-id
```


