# EvalForge

EvalForge is a browser-based application that functionally tests AI agent endpoints. It generates test cases, calls a selected target agent, evaluates the responses, analyzes failures, and creates adaptive follow-up tests.

The active product specification is [gift.md](gift.md), and the implementation sequence is documented in [docs/EXECUTION_PLAN.md](docs/EXECUTION_PLAN.md).

## Architecture

- React and TypeScript frontend built with Vite
- No custom application backend
- Fixed EvalForge reasoning service for generation, evaluation, analysis, and recommendations
- Direct browser requests to saved target-agent endpoints
- Agent profiles and run history stored in browser `localStorage`

## Reasoning service

The application uses these existing endpoints:

- `POST /generate`
- `POST /evaluate`
- `POST /analyze`
- `POST /recommend`

Base URL: `https://evalforge-test-buddy.lovable.app/api/public`

## Local development

```bash
cd frontend
npm install
npm run dev
```

## Verification

```bash
cd frontend
npm test
npm run lint
npm run build
```

## Current status

Phase 1 is complete: the React project, TypeScript data contracts, centralized constants, runtime data guards, test environment, and initial application shell are established.
