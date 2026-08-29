# EvalForge website — build prompt

This is for building the website itself (Claude Code, or any React setup) — the LLM service is already built and live in Lovable at:

```
https://evalforge-test-buddy.lovable.app/api/public
```

---

## What to build

**EvalForge** — a React web app that functionally tests AI agent endpoints. It generates test cases, runs them against a target agent, evaluates and analyses the results, and generates adaptive follow-up tests — looping automatically. All LLM reasoning happens by calling the four endpoints below; this app never calls an LLM directly.

Agents (the systems under test) are saved once as reusable profiles, so the user doesn't have to re-enter connection details, headers, or system prompt every run — they just pick a saved agent.

Single-user, no backend of its own. **Everything in localStorage as JSON.**

---

## LLM Service (already built — call it, don't rebuild it)

Base URL: `https://evalforge-test-buddy.lovable.app/api/public`

### `POST /generate`
Request:
```json
{
  "requirements": "string",
  "constraints": "string, optional",
  "agent_context": { "system_prompt": "string, optional", "description": "string, optional" },
  "num_tests": 10
}
```
Response:
```json
{ "tests": [ { "input": "string", "expected_behaviour": "string", "category": "happy_path | invalid_input | edge_case | security | consistency" } ] }
```

### `POST /evaluate`
Request:
```json
{
  "input": "string",
  "expected_behaviour": "string",
  "actual_response": "string",
  "agent_context": { "system_prompt": "string, optional", "description": "string, optional" }
}
```
Response:
```json
{ "passed": true, "reasoning": "one sentence" }
```

### `POST /analyze`
Request:
```json
{
  "requirements": "string",
  "agent_context": { "system_prompt": "string, optional", "description": "string, optional" },
  "failed_tests": [ { "id": "t2", "input": "string", "expected_behaviour": "string", "actual_response": "string" } ]
}
```
Response:
```json
{ "analyses": [ { "test_id": "t2", "explanation": "string", "failure_type": "hallucination | inconsistency | scope_violation | security | instruction_following | other" } ] }
```

### `POST /recommend`
Request:
```json
{
  "requirements": "string",
  "agent_context": { "system_prompt": "string, optional", "description": "string, optional" },
  "analyses": [ { "test_id": "t2", "explanation": "string", "failure_type": "inconsistency" } ]
}
```
Response:
```json
{ "tests": [ { "input": "string", "expected_behaviour": "string", "category": "string", "spawned_from": "t2" } ] }
```

Handle non-200 responses and malformed JSON gracefully — throw and let the caller show an inline error on that step, don't crash the run.

---

## Data storage (localStorage, JSON)

Two collections:
- `evalforge_agents` — array of saved agent profiles
- `evalforge_run_<timestamp>` — one key per run

### Agent record shape
```json
{
  "id": "agent_abc123",
  "name": "BookBot demo",
  "url": "string",
  "method": "POST",
  "headers": { "Authorization": "Bearer ...", "Content-Type": "application/json" },
  "body_template": "{ \"messages\": [ { \"role\": \"user\", \"content\": \"{{input}}\" } ] }",
  "response_path": "choices.0.message.content",
  "system_prompt": "string, optional",
  "description": "string, optional",
  "created_at": "timestamp"
}
```

### Run record shape
```json
{
  "id": "run_1234",
  "agent_id": "agent_abc123",
  "agent_snapshot": {
    "name": "string", "url": "string", "method": "POST",
    "headers": {}, "body_template": "string", "response_path": "string",
    "system_prompt": "string, optional", "description": "string, optional"
  },
  "requirements": "string",
  "constraints": "string, optional",
  "iterations": [
    {
      "iteration_number": 1,
      "tests": [
        {
          "id": "t1",
          "input": "string",
          "expected_behaviour": "string",
          "category": "happy_path",
          "actual_response": "string",
          "latency_ms": 812,
          "passed": true,
          "eval_reasoning": "string",
          "failure_analysis": null,
          "spawned_from": null
        }
      ],
      "pass_rate": 0.85
    }
  ]
}
```

---

## Screens

### 0. Agents (manage saved targets)
- List of saved agents (name, url, created date) with Edit / Delete / "Use for new run"
- "Add agent" form covering every field in the Agent record shape:
  - Name
  - Endpoint URL
  - HTTP method: GET / POST (default POST)
  - Headers: repeatable key-value rows (e.g. `Authorization`, `x-api-key`, `Content-Type`)
  - Request body template: JSON textarea with a literal `{{input}}` placeholder, e.g. `{ "messages": [ { "role": "user", "content": "{{input}}" } ] }`
  - Response path: dot-path to the reply text in the target's JSON response, e.g. `choices.0.message.content`
  - System prompt (textarea, optional but encouraged — improves evaluate/analyze quality)
  - Description (textarea, optional)
- Saves to `evalforge_agents`

### 1. Setup (new run)
- Dropdown: pick a saved agent (link to "add agent" if none saved yet)
- Textarea: requirements / expected behaviour for this run
- Text input (optional): constraints, e.g. "focus on consistency and security"
- Button: "Generate tests" → calls `/generate`, snapshots the agent config into a new run record, moves to Run screen
- List of past runs below, each clickable to reopen Results

### 2. Run
- Horizontal stepper: Generate → Run → Evaluate → Analyse → Adapt
- Live feed of test cases: input, expected behaviour, actual response, pass/fail badge (badge appears once Evaluate returns for that test)
- For each test, in order:
  1. Build the request from the agent's saved config (method, headers, body_template with `{{input}}` substituted) and send it directly to the agent's own URL — capture `actual_response` via `response_path` and `latency_ms`. This call goes straight to the target agent, not to the LLM service.
  2. Call `/evaluate` with the test's input/expected/actual plus agent_context — store `passed` and `reasoning`
- After the batch finishes: call `/analyze` with the failed tests + agent_context, then `/recommend` with the analyses, append the new tests as the next iteration, run it automatically — up to 3 iterations total, then stop with a "run another iteration" button
- Running total: pass rate, tests run, current iteration

### 3. Results
- Overall pass rate (big number)
- Failure breakdown by category (bar list)
- Expandable list of every test: input, expected, actual, pass/fail, eval reasoning, and for failures — analysis explanation + which follow-up test it spawned
- Pass rate per iteration as a simple line/bar chart
- Button: export the full run as JSON

---

## Networking notes

- The LLM service base URL is fixed: `https://evalforge-test-buddy.lovable.app/api/public`. Put it in one constants file, not scattered inline.
- Every LLM service call is `POST`, `Content-Type: application/json`, JSON body in, JSON body out. Wrap calls so network errors, non-200 responses, and unparseable JSON all throw a catchable error with a useful message — the Run screen shows this inline on the relevant stepper step rather than crashing.
- The target agent call (step 2.1 above) is a *separate* fetch using the agent's own stored `url`/`method`/`headers`/`body_template` — never route that through the LLM service.

---

## Style

Clean, minimal, dashboard-like. Flat surfaces, no gradients, subtle card borders only. Pass = green, fail = red, running/pending = muted grey. Agents screen is a simple list + form. Setup is a quick picker once agents exist. The Run screen with the live stepper and test feed is the visual centerpiece.