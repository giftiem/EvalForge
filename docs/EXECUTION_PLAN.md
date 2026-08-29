# EvalForge React Execution Plan

This is the active implementation plan. The product specification in `gift.md` is the source of truth.

## Architecture

EvalForge is a single-user React application with no custom backend.

The browser communicates with two separate systems:

1. The fixed EvalForge reasoning service at `https://evalforge-test-buddy.lovable.app/api/public` for test generation, evaluation, failure analysis, and recommendations.
2. The user-selected target agent URL for executing generated prompts.

Agent profiles and complete run records are stored as JSON in browser `localStorage`.

```text
React application
  |-- localStorage: saved agents and run history
  |-- EvalForge service
  |     |-- POST /generate
  |     |-- POST /evaluate
  |     |-- POST /analyze
  |     `-- POST /recommend
  `-- Target agent URL
        `-- request constructed from saved method, headers, and body template
```

The application must never call an LLM directly and must never route target-agent requests through the EvalForge reasoning service.

## Phase 1: React Foundation and Data Contracts

1. Create the React application with TypeScript and Vite.
2. Establish folders for screens, reusable components, services, storage, models, hooks, and utilities.
3. Define TypeScript models matching the agent and run records in `gift.md`.
4. Put the fixed reasoning-service base URL in one constants file.
5. Implement safe JSON parsing and runtime validation at external-data boundaries.
6. Add test tooling and browser-storage mocks.

Completion check: the app builds, tests run, and valid/invalid agent and run data can be distinguished safely.

## Phase 2: Agent Profiles and Local Storage

1. Implement a versioned localStorage repository for `evalforge_agents`.
2. Build the Agents screen with list, add, edit, delete, and “Use for new run” actions.
3. Support GET and POST, repeatable headers, body templates, response dot-paths, system prompts, and descriptions.
4. Validate URLs, header rows, JSON body templates, and the required literal `{{input}}` placeholder.
5. Warn clearly that authorization headers are stored locally in the browser.

Completion check: an agent survives page reload, can be edited/deleted, and can be selected for a run.

## Phase 3: Networking Services

1. Create one shared JSON POST wrapper for the reasoning service.
2. Implement typed clients for `/generate`, `/evaluate`, `/analyze`, and `/recommend`.
3. Convert network failures, non-2xx responses, timeouts, and malformed JSON into useful catchable errors.
4. Implement the separate target-agent client:
   - substitute the test input into `body_template`;
   - apply the saved method and headers;
   - call the target URL directly;
   - measure latency; and
   - extract reply text using `response_path`.
5. Ensure errors contain no exposed authorization values.

Completion check: mocked contract tests verify every reasoning endpoint and multiple target response paths.

## Phase 4: Setup and Initial Generation

1. Build the Setup screen with saved-agent selection, requirements, optional constraints, and past runs.
2. Call `/generate` and validate the returned tests.
3. Snapshot the selected agent configuration into a new run record.
4. Save the run under `evalforge_run_<timestamp>` before navigating to the Run screen.
5. Show generation failures inline without losing form state.

Completion check: a user can select an agent, generate an initial suite, and reopen the saved run after reload.

## Phase 5: Run and Evaluation Loop

For every test in an iteration:

1. Call the target agent directly and capture actual response and latency.
2. Call `/evaluate` with input, expected behaviour, actual response, and agent context.
3. Save pass/fail and evaluator reasoning immediately.
4. Update the live test feed and run totals.

After the iteration:

1. Call `/analyze` with failed tests.
2. Attach returned analyses to their matching tests.
3. Call `/recommend` with those analyses.
4. Create the next iteration using the recommended tests and `spawned_from` links.
5. Run automatically until three iterations are complete.
6. Then stop and expose a manual “Run another iteration” action.

Persist after every meaningful state change so a refresh does not erase progress. Guard against duplicate execution if the page reloads mid-run.

Completion check: the full generate → run → evaluate → analyze → recommend loop finishes and is recoverable from localStorage.

## Phase 6: Results and Export

1. Display overall pass rate and total tests.
2. Show failure counts by category.
3. Show pass rate per iteration as a simple chart.
4. Provide expandable evidence for every test: input, expected output, actual output, latency, verdict, evaluator reasoning, failure explanation, and spawned follow-up.
5. Export the entire stored run record as JSON.

Completion check: results can be understood without opening developer tools and exported data matches the stored run.

## Phase 7: Reliability and Final Polish

1. Add loading, empty, error, retry, and partial-run states to every screen.
2. Add request cancellation and sensible timeouts.
3. Handle CORS failures from target agents with a clear explanation.
4. Prevent accidental deletion of agents referenced by saved runs, or retain their run snapshots safely.
5. Test malformed templates, missing response paths, invalid service responses, target timeouts, and interrupted adaptive loops.
6. Apply the requested flat dashboard style with subtle borders and accessible pass/fail states.

Completion check: production build succeeds and the main user flow works on desktop and mobile.

## Active Project Direction

- React/TypeScript frontend: active implementation.
- Existing static dashboard: visual reference to migrate into React.
- Existing Python backend: retained temporarily as legacy work, but not part of the new runtime.
- Langfuse and direct LLM integration: removed from the active application plan because evaluation is supplied by the live reasoning service.
- Browser localStorage: system of record for the MVP.

