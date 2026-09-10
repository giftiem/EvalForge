# EvalForge

EvalForge is a browser-based application that functionally tests AI agent endpoints. It generates test cases, calls a selected target agent, evaluates the responses, analyzes failures, and creates adaptive follow-up tests.

The active product specification is [gift.md](gift.md).

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
npm run dev --prefix frontend
```

Vite proxies `/api/evalforge/*` locally using the server-side value from `.env`. Netlify Functions provide the equivalent proxy after deployment.

Reasoning-service calls are aborted client-side after 55 seconds; direct target-agent calls after 120 seconds. Note that Netlify's own synchronous function limit is lower than that (10 seconds by default, up to 26 seconds on paid plans with the extended timeout enabled) — a slow reasoning-service response can be cut off by the platform before this client-side timeout ever fires. If that happens in practice, request the extended 26-second limit from Netlify, or move long-running reasoning calls off the synchronous function path.

## Verification

```bash
cd frontend
npm test
npm run lint
npm run build
```

## Current status

All seven MVP phases are complete. EvalForge can manage agents, generate and execute adaptive test suites, evaluate and analyze failures, resume interrupted work, display full evidence dashboards, and export complete runs as JSON.

## Team

**EvalForge**

- Gift — Full Stack
- Cali — Full Stack
