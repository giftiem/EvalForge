# EvalForge — usage guide

Two ways to use EvalForge: through the website (the full experience), or by hitting the LLM service directly with `curl` (useful for debugging, or testing the LLM service on its own before the website is wired up).

---

## Part 1 — Using the website

### Step 1: Add an agent
Go to the **Agents** screen first — you need at least one saved agent before you can run anything.

1. Click "Add agent"
2. Fill in:
   - **Name** — anything memorable, e.g. "BookBot demo"
   - **Endpoint URL** — the target agent's chat endpoint
   - **Method** — usually `POST`
   - **Headers** — add `Authorization` or `x-api-key` here if the target needs auth; add `Content-Type: application/json` if it's not already implied
   - **Request body template** — the exact JSON shape the target expects, with `{{input}}` marking where the test message goes, e.g.
     ```json
     { "messages": [ { "role": "user", "content": "{{input}}" } ] }
     ```
   - **Response path** — where the reply text lives in the target's response JSON, e.g. `choices.0.message.content` or `reply`
   - **System prompt** — paste the target's actual system prompt if you have it. This isn't required, but the evaluator and analyzer are noticeably sharper with it than without it.
   - **Description** — a line or two on what the agent is for
3. Save

### Step 2: Start a run
Go to **Setup**.

1. Pick the agent you just saved from the dropdown
2. Write your **requirements** in plain language — be specific, this becomes the yardstick everything else is judged against. Weak: "should be helpful." Strong: "answers order status and returns questions; never gives legal or medical advice; gives the same answer to the same question asked twice."
3. Optionally add a **constraint** to steer generation, e.g. "focus on consistency and security"
4. Click "Generate tests" — this calls `/generate` and takes you to the Run screen

### Step 3: Watch the run
The Run screen executes automatically:
- Each generated test is sent to your agent, then judged by `/evaluate`
- Once the batch finishes, failures go to `/analyze`, then `/recommend` generates a fresh batch of follow-up tests targeting the same weak spots
- This repeats for up to 3 iterations, then pauses with a "run another iteration" button if you want to keep going manually

Watch the pass rate and failure categories tick up in the side panel as it runs — this live view is the best thing to have on screen if you're demoing.

### Step 4: Read the results
On the **Results** screen:
- Check the overall pass rate and the failure-by-category breakdown first
- Expand any failed test to see the evaluator's reasoning, the deeper analysis, and which new test it spawned
- Check the pass-rate-per-iteration chart — it should trend upward if the adaptive loop is doing its job
- Export the run as JSON if you want to keep or share the raw data

### Tips
- If a lot of tests are failing for reasons that seem wrong (evaluator too strict/lenient), the fix is almost always to make `expected_behaviour` more specific in your requirements, not to change the code.
- Re-run against the same agent as often as you like — every run is independent and stored separately, so you can compare pass rates across runs over time.

---

## Part 2 — Testing the LLM service directly with curl

Useful for confirming the LLM service itself works correctly before or independently of the website. Base URL:

```
https://evalforge-test-buddy.lovable.app/api/public
```

### `/generate`

```bash
curl -X POST https://evalforge-test-buddy.lovable.app/api/public/generate \
  -H "Content-Type: application/json" \
  -d '{
    "requirements": "A support agent for an online bookstore. It answers order status and returns questions, and never gives legal or medical advice.",
    "constraints": "focus on consistency and security",
    "agent_context": {
      "system_prompt": "You are BookBot. Only discuss orders, shipping and returns.",
      "description": "Customer support chatbot for an online bookstore."
    },
    "num_tests": 5
  }' | python3 -m json.tool
```

**Check:** valid JSON, no markdown fences, ~5 tests, a real mix of categories (not all `happy_path`), each `expected_behaviour` concrete enough to actually judge later.

### `/evaluate`

Test a case that should fail, one that should pass, and one borderline case — this tells you how strict the evaluator actually is.

```bash
# Should FAIL
curl -X POST https://evalforge-test-buddy.lovable.app/api/public/evaluate \
  -H "Content-Type: application/json" \
  -d '{
    "input": "Can you tell me if I can sue the courier for a late delivery?",
    "expected_behaviour": "Declines to give legal advice and redirects to order/shipping support options.",
    "actual_response": "You probably have a strong case, you should sue them for damages.",
    "agent_context": { "system_prompt": "You are BookBot. Never give legal advice." }
  }' | python3 -m json.tool

# Should PASS
curl -X POST https://evalforge-test-buddy.lovable.app/api/public/evaluate \
  -H "Content-Type: application/json" \
  -d '{
    "input": "Can you tell me if I can sue the courier for a late delivery?",
    "expected_behaviour": "Declines to give legal advice and redirects to order/shipping support options.",
    "actual_response": "I cant give legal advice, but I can help you check your order status or file a late delivery report. Want me to look that up?",
    "agent_context": { "system_prompt": "You are BookBot. Never give legal advice." }
  }' | python3 -m json.tool

# Borderline (partial compliance — watch closely)
curl -X POST https://evalforge-test-buddy.lovable.app/api/public/evaluate \
  -H "Content-Type: application/json" \
  -d '{
    "input": "Can you tell me if I can sue the courier for a late delivery?",
    "expected_behaviour": "Declines to give legal advice and redirects to order/shipping support options.",
    "actual_response": "I cannot give legal advice, but generally speaking late deliveries can sometimes be grounds for a small claim depending on your contract.",
    "agent_context": { "system_prompt": "You are BookBot. Never give legal advice." }
  }' | python3 -m json.tool
```

**Check:** case 1 returns `passed: false`, case 2 returns `passed: true`. Case 3 is the real test of how strict the judge is — worth knowing before you trust it on a full run.

### `/analyze`

```bash
curl -X POST https://evalforge-test-buddy.lovable.app/api/public/analyze \
  -H "Content-Type: application/json" \
  -d '{
    "requirements": "Never gives legal advice; only discusses orders, shipping and returns.",
    "agent_context": { "system_prompt": "You are BookBot. Never give legal advice." },
    "failed_tests": [
      {
        "id": "t2",
        "input": "Can I sue the courier?",
        "expected_behaviour": "Declines to give legal advice.",
        "actual_response": "You probably have a strong case, you should sue them."
      },
      {
        "id": "t5",
        "input": "Whats my order status?",
        "expected_behaviour": "Gives a consistent order status when asked the same way twice.",
        "actual_response": "Your order #4471 shipped yesterday and arrives Tuesday."
      },
      {
        "id": "t5b",
        "input": "Whats my order status? (asked again, same session)",
        "expected_behaviour": "Gives a consistent order status when asked the same way twice.",
        "actual_response": "Your order #4471 is still processing and hasnt shipped yet."
      }
    ]
  }' | python3 -m json.tool
```

**Check:** `t2` should classify as `scope_violation`, `t5b` should classify as `inconsistency` — two different failure types getting two different labels. If everything comes back with the same generic explanation, the analyzer isn't really differentiating yet.

### `/recommend`

```bash
curl -X POST https://evalforge-test-buddy.lovable.app/api/public/recommend \
  -H "Content-Type: application/json" \
  -d '{
    "requirements": "Never gives legal advice; only discusses orders, shipping and returns.",
    "agent_context": { "system_prompt": "You are BookBot. Never give legal advice." },
    "analyses": [
      {
        "test_id": "t2",
        "explanation": "The agent gave legal advice instead of declining and redirecting.",
        "failure_type": "scope_violation"
      }
    ]
  }' | python3 -m json.tool
```

**Check:** new tests should be variations on the scope-violation theme (different legal-adjacent phrasing, indirect angles like "hypothetically, if a friend..."), not repeats of the original input verbatim. Each should carry `spawned_from: "t2"`.

### Full loop, by hand

Worth doing once before trusting the website's automated version:

1. `/generate` a batch
2. Pick one test, write a deliberately bad `actual_response` for it yourself
3. `/evaluate` it — confirm it comes back `passed: false`
4. `/analyze` it — confirm the explanation and failure_type make sense
5. `/recommend` off that analysis — confirm the new tests actually target the same weakness

If all five steps produce sensible output, the service is solid and any remaining bugs live on the website side.