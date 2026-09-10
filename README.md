# EvalForge

EvalForge is a browser-based application that functionally tests AI agent endpoints. It generates test cases, calls a selected target agent, evaluates the responses, analyzes failures, and creates adaptive follow-up tests.

The active product specification is [gift.md](gift.md), and the implementation sequence is documented in [docs/EXECUTION_PLAN.md](docs/EXECUTION_PLAN.md).

## Architecture

- React and TypeScript frontend built with Vite
- No custom application backend
- Same-origin Netlify Function proxy for the EvalForge reasoning service
- Direct browser requests to saved target-agent endpoints
- Agent profiles and run history stored in browser `localStorage`

## Reasoning service

The application uses these existing endpoints:

- `POST /generate`
- `POST /evaluate`
- `POST /analyze`
- `POST /recommend`

The browser calls `/api/evalforge/*`. A Netlify Function forwards those requests to the upstream reasoning service, so its address is not embedded in the frontend bundle.

For local development, copy the environment template:

```bash
cd frontend
cp .env.example .env
```

The main configuration value is:

```text
EVALFORGE_SERVICE_BASE_URL=https://your-service.example/api/public
```

Set this variable in Netlify under **Project configuration → Environment variables**, with Functions access, and redeploy. It intentionally has no `VITE_` prefix, so Vite does not expose its value to the browser.

## Local development

```bash
# Run these commands from the repository root.
npm install --prefix frontend
npm run dev
```

Vite proxies `/api/evalforge/*` locally using the server-side value from `.env`. Netlify Functions provide the equivalent proxy after deployment.

Reasoning-service calls allow 55 seconds, just below Netlify's synchronous function limit. Direct target-agent calls allow 120 seconds.

## Verification

```bash
cd frontend
npm test
npm run lint
npm run build
```

## Current status

All seven MVP phases are complete. EvalForge can manage agents, generate and execute adaptive test suites, evaluate and analyze failures, resume interrupted work, display full evidence dashboards, and export complete runs as JSON.
