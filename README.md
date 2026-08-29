# EvalForge

**An AI agent that tests other AI agents.**

EvalForge is a closed-loop functional testing system for AI/API-driven applications. It generates functional test cases from plain-language requirements, executes them against a target system, evaluates the results using Langfuse, explains *why* things failed, and then automatically generates smarter follow-up tests targeting the weak spots it just found — repeating until coverage and quality are satisfactory.

Built for the [Sebaka South Africa AI Agent Challenge](https://sebakasouthafrica.co.za/ai-agent-challenge.html), under the **Functional Testing** problem statement: *generate, analyse, prioritise, and execute functional testing activities.*

---

## Why this exists

Testing AI systems today is mostly manual: someone dreams up test cases, runs them by hand, reads the transcripts, and figures out what broke. That doesn't scale, and it misses the failure modes that matter most for AI systems specifically — inconsistency, hallucination, overconfidence on things the system doesn't actually know, and silent misrouting of intent.

EvalForge automates the whole loop, and — critically — it doesn't stop at one static pass. It uses what it learns from failures to write better tests next round, so the more it runs against a target, the sharper it gets at finding real problems.

---

## The core loop

```
Requirements → Generate tests → Execute tests → Evaluate (Langfuse)
      ↑                                                  │
      │                                                  ▼
Generate targeted follow-ups ← Analyse failures ←────────┘
```

This adaptive loop is the differentiator. Without it, EvalForge is "an API wired up to Langfuse." With it, EvalForge behaves like an actual testing agent — one that gets more effective the longer it's pointed at a system, instead of running the same fixed checklist every time.

---

## Architecture

**EvalForge MVP Architecture — AI Functional Testing Agent with Langfuse Evaluation Layer**

| # | Component | Role |
|---|---|---|
| 1 | **Inputs** | The API/agent URL to test, plus requirements or expected behaviour, and optional constraints (e.g. "focus on edge cases," "focus on hallucinations"). |
| 2 | **Test Generation Agent** (LLM-powered) | Turns requirements into a structured test suite (JSON) — happy path, edge cases, invalid inputs — each with an expected outcome. |
| 3 | **Test Runner** | Sends each generated test to the target system, captures responses and errors, measures latency, stores raw results. Purely mechanical — no judgment calls here. |
| 4 | **Dummy AI Endpoint** (MVP demo target) | A small FastAPI service standing in for a real system under test — a simple support-assistant API with a few *intentional* bugs seeded in (see below), so the demo has real problems to find. |
| 5 | **Langfuse — Evaluation & Observability** | The system of record. Stores traces (runs/inputs/outputs/metadata), holds test cases as datasets, runs evaluators (LLM-as-judge + rule-based scoring), and tracks experiments/scores over time. **EvalForge generates tests; Langfuse stores and evaluates them.** |
| 6 | **Results & Report** | Human-readable output: overall pass rate, failure breakdown by category, detailed explanations, demo dashboard. |
| 7 | **Failure Analysis Agent** | Reviews failed tests, explains *why* they failed, classifies the failure type (hallucination, incorrect routing, inconsistency, bad unknown-input handling, etc.), and recommends follow-up tests. |
| 8 | **Adaptive Test Generation** | Generates new tests focused on the weak areas and regressions surfaced by the Failure Analysis Agent, and feeds them back into the Test Runner — closing the loop. |

The loop repeats: **iterate until satisfactory coverage and quality.**

### Dummy AI Agent Endpoint — example behaviour (demo target)

Built via Lovable call via 
```bash
curl -X POST https://simple-safe-talk.lovable.app/api/public/chat \
  -H "Content-Type: application/json" \
  -d '{"messages":[{"role":"user","content":"Hi, what is my balance?"}]}'
```
https://lovable.dev/projects/7627e092-22a3-433b-8d03-dc0eb18f9222?view=codeEditor

 Its current system prompt: 

 ```
 You are BankBot, a friendly and professional virtual banking assistant for a fictional bank called "Lovable Bank".

You help customers with:
- Account balances and transactions (explain these are demo/sample answers since no real accounts are connected)
- Transfers, payments, and card questions
- Explaining banking products: savings accounts, loans, mortgages, credit cards, interest rates
- Branch hours, fees, and general banking guidance
- Fraud/security advice and how to report lost cards

Rules:
- Be concise, warm, and professional. Keep replies short (2-4 sentences unless detail is requested).
- This is a demo bank with no real accounts. When asked for personal data like a real balance, give a realistic sample answer (e.g. "Your current demo balance is R4,250.00").
- Never ask for or accept real passwords, PINs, or full card numbers. If a user shares one, warn them not to share sensitive credentials.
- If you can't help, say you'll connect them to a human agent.`
 ```
---

## Tech stack

- **LLM** — test generation + failure analysis (LLM-as-judge)
- **FastAPI** — dummy AI endpoint (target system) and/or backend services
- **Langfuse** — traces, datasets, evaluators, experiment/score tracking
- **Python** — test runner, orchestration
- *(fill in: frontend/dashboard framework, hosting, etc.)*

---

## Getting started

```bash
# clone
git clone <repo-url>
cd evalforge

# install dependencies
pip install -r requirements.txt

# set environment variables (LLM API key, Langfuse keys, etc.)
cp .env.example .env

```

*(adjust commands to match actual repo structure once built)*

---

## Project status

Hackathon MVP — built to demonstrate the adaptive test → evaluate → analyse → retest loop end-to-end against a controlled demo target. Not production-hardened.

## Team

*(add names/roles)*

## License

*(add license)*