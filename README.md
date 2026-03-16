# Simulator

Agent-based model simulator. Simple micro-rules produce emergent macro-patterns.

## Models

| Model | Description | Live |
|-------|-------------|------|
| Wolf Sheep Predation | Predator-prey dynamics with grass — wolves hunt, sheep flee and graze, populations oscillate | [Run it](https://drashtishah.github.io/abm/) |

## Run locally

```bash
cd sim
npm install
npm run dev
```

Open `http://localhost:5173`

## Tests

```bash
cd sim
npm test          # unit + integration + stress
npm run test:e2e  # Playwright browser tests
```
