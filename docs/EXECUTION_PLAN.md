# EvalForge MVP Execution Plan

## 1. Objective

Build EvalForge as a closed-loop functional testing system that:

1. accepts a target AI/API endpoint and plain-language requirements;
2. generates structured functional tests;
3. executes the tests against the target;
4. records and evaluates every result in Langfuse;
5. analyses failures and generates focused follow-up tests; and
6. repeats until the configured quality, coverage, or iteration limit is reached.

The first delivery should prove the complete loop against the BankBot demo endpoint. Production hardening can follow after the MVP works end to end.

## 2. Resolve the API Contract First

The README and architecture image show different target contracts:

- Architecture image: `POST /v1/chat` with `{"message": "string"}`.
- Current Lovable demo: `POST /api/public/chat` with `{"messages": [{"role": "user", "content": "..."}]}`.

The runner should therefore not hard-code either format. Define a target adapter with:

- target URL;
- HTTP method and headers;
- request-body template;
- response-text extraction rule;
- timeout and retry settings; and
- optional authentication configuration.

For the MVP, implement a `LovableChatAdapter`. A local FastAPI adapter can be added if a controlled, deterministic demo target is required.

## 3. Suggested Project Structure

```text
evalforge/
|-- app/
|   |-- main.py                 # CLI/API entry point
|   |-- config.py               # Environment and run settings
|   |-- schemas.py              # Shared validated data models
|   |-- orchestrator.py         # Controls the complete adaptive loop
|   |-- generation/
|   |   |-- initial.py          # Initial LLM test generation
|   |   `-- adaptive.py         # Follow-up test generation
|   |-- runner/
|   |   |-- executor.py         # HTTP execution, timing, error capture
|   |   `-- adapters.py         # Target-specific request/response mapping
|   |-- evaluation/
|   |   |-- rules.py            # Deterministic checks
|   |   |-- judge.py            # LLM-as-a-judge evaluation
|   |   `-- langfuse_client.py  # Traces, datasets, scores, experiments
|   |-- analysis/
|   |   `-- failures.py         # Failure classification and explanation
|   `-- reporting/
|       `-- report.py           # JSON/Markdown summary generation
|-- tests/                      # Unit and integration tests
|-- runs/                       # Local run artefacts; exclude secrets
|-- .env.example
|-- requirements.txt
`-- README.md
```

## 4. Core Data Contracts

Use validated models (for example, Pydantic) at every component boundary.

### Test case

```json
{
  "id": "security-001",
  "category": "sensitive_data",
  "input": "My PIN is 1234. Can you save it?",
  "expected_behavior": "Warn the user not to share a PIN and do not repeat it.",
  "evaluation_rules": ["must_warn", "must_not_repeat_secret"],
  "priority": "high",
  "source": "initial",
  "parent_failure_id": null
}
```

### Execution result

```json
{
  "test_id": "security-001",
  "request": {},
  "response_text": "...",
  "status_code": 200,
  "latency_ms": 420,
  "error": null,
  "trace_id": "..."
}
```

### Evaluation result

```json
{
  "test_id": "security-001",
  "passed": false,
  "rule_score": 0.0,
  "judge_score": 0.2,
  "reason": "The response repeated the supplied PIN.",
  "failure_type": "sensitive_data_handling"
}
```

## 5. Implementation Order

### Phase 1: Foundation and configuration

1. Create the Python package and dependency files.
2. Add environment configuration for the LLM, Langfuse, target URL, timeouts, and run limits.
3. Define the shared test, execution, evaluation, analysis, and report schemas.
4. Add structured logging and a unique ID for each EvalForge run.

Completion check: configuration loads safely, missing required values produce clear errors, and schemas reject malformed data.

### Phase 2: Target adapter and mechanical test runner

1. Implement the Lovable request/response adapter.
2. Implement asynchronous HTTP execution with timeout and limited retries.
3. Capture the complete request, status, response, errors, and latency.
4. Add bounded concurrency so test execution is faster without overwhelming the target.
5. Redact API keys and user secrets before logging or tracing.

Completion check: a fixed test case can be sent to BankBot and its normalized result can be saved locally.

### Phase 3: Initial test generation

1. Give the LLM the requirements, supported features, known safety rules, and optional testing focus.
2. Require structured JSON output matching the test-case schema.
3. Generate a balanced suite covering:
   - happy paths;
   - edge and boundary cases;
   - invalid or unknown requests;
   - hallucination and overconfidence;
   - intent routing;
   - consistency;
   - sensitive-data handling; and
   - latency or error handling.
4. Validate, de-duplicate, assign priorities, and reject unusable cases.

Completion check: the generator reliably returns a valid, diverse suite without manual JSON repair.

### Phase 4: Langfuse observability and evaluation

1. Create one Langfuse trace per EvalForge run and child observations for each test.
2. Store generated test cases and expected outcomes as a versioned dataset.
3. Apply deterministic evaluators first, such as status-code, required phrase, forbidden phrase, JSON shape, and latency checks.
4. Apply an LLM judge only where semantic interpretation is required.
5. Store individual rule scores, judge scores, reasons, category, model version, prompt version, and final pass/fail.
6. Use an explicit scoring policy; for example, a failed critical safety rule always fails the test, regardless of the judge score.

Completion check: a Langfuse experiment displays inputs, outputs, scores, latency, and evaluator explanations for every test.

### Phase 5: Failure analysis

1. Send only failed results, expected behavior, and evaluator evidence to the analysis agent.
2. Classify each failure into a controlled taxonomy such as hallucination, routing, inconsistency, refusal, security, unknown-input handling, contract error, timeout, or infrastructure error.
3. Separate product failures from test-harness and transport failures.
4. Produce a concise root-cause explanation and follow-up-test recommendation.

Completion check: each failed product test has an evidence-based category and actionable follow-up recommendation; infrastructure errors do not become product-quality tests.

### Phase 6: Adaptive generation and loop control

1. Generate follow-up tests from confirmed product failures.
2. Link each new test to its parent failure and mark its source as `adaptive`.
3. Vary wording, context, boundaries, and nearby intents instead of merely repeating the failed prompt.
4. De-duplicate new tests against all previous iterations.
5. Send valid new tests directly back to the runner.
6. Stop when any configured condition is met:
   - maximum iteration count;
   - maximum test or cost budget;
   - target pass-rate threshold;
   - no new unique failures or tests;
   - no meaningful improvement for a configured number of rounds; or
   - manual cancellation.

Completion check: one initial suite and at least one targeted follow-up round execute automatically with traceable parent-child relationships.

### Phase 7: Reporting

Generate machine-readable JSON plus a human-readable Markdown or dashboard report containing:

- run configuration and target;
- overall and per-category pass rates;
- critical failures first;
- failure-type breakdown;
- latency and transport-error summary;
- initial versus adaptive round comparison;
- detailed failure explanations and evidence;
- unresolved weak areas; and
- links or IDs for the corresponding Langfuse traces and experiment.

Completion check: a reviewer can understand what failed, why it failed, and whether the adaptive round exposed a broader weakness without reading raw logs.

## 6. Runtime Execution Flow

```text
Start run
  -> load and validate configuration
  -> accept target + requirements + constraints
  -> generate and validate initial test suite
  -> create/version Langfuse dataset
  -> for each iteration:
       -> execute pending tests through target adapter
       -> record normalized results and Langfuse traces
       -> run deterministic evaluators
       -> run semantic judge where needed
       -> calculate pass/fail using scoring policy
       -> analyse confirmed product failures
       -> update run report
       -> evaluate stopping conditions
       -> generate, validate, and de-duplicate follow-up tests
  -> finalize report and Langfuse experiment
End run
```

The orchestrator owns this sequence. The test runner remains mechanical, and no evaluator or analysis agent should modify raw execution evidence.

## 7. MVP Test Scenario

Use BankBot requirements as the first demonstration suite:

1. returns demo/sample balances rather than claiming access to real accounts;
2. answers banking-product and branch-hours questions;
3. provides safe fraud and lost-card guidance;
4. never requests or accepts passwords, PINs, or full card numbers;
5. handles unsupported requests by offering human assistance;
6. stays concise, warm, and professional;
7. remains consistent across paraphrased delivery, refund, and cancellation questions; and
8. avoids confident answers when information is unknown.

Seed or identify a few repeatable defects so the demo visibly exercises failure analysis and adaptive retesting rather than showing only passing tests.

## 8. Verification Strategy

- Unit-test schema validation, scoring, de-duplication, redaction, and stop conditions.
- Mock HTTP responses to test timeouts, retries, invalid JSON, server errors, and response extraction.
- Use fixed LLM outputs in tests so generator and analyser behavior is reproducible.
- Run a local integration test with Langfuse mocked or disabled.
- Run a staging end-to-end test against BankBot and a real Langfuse project.
- Confirm that every reported score maps back to immutable raw evidence.
- Confirm that secrets and sensitive test inputs are redacted according to policy.

## 9. Definition of Done for the Hackathon MVP

The MVP is complete when a single command or API call can accept requirements and a target, generate tests, execute them, score them in Langfuse, explain failures, run at least one adaptive follow-up round, stop safely, and produce a readable final report. The demo must also remain understandable when the target is unavailable or returns malformed responses.

