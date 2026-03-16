---
name: code
description: >-
  Guide for editing, refactoring, and adding features to the ABM simulator codebase.
  Covers architecture rules, testing strategy (Vitest + Playwright), AI guardrails,
  commenting standards, and agent-readable output. Use when making any code changes
  to files under sim/src/, adding new models, fixing bugs, writing tests, or modifying the UI.
---

## 1. Project Overview

- **Stack**: Vite + TypeScript (strict mode), entry: `sim/src/main.ts`, HTML shell: `sim/index.html`
- **Commands** (run from `sim/`):
  - `npm run dev` — Vite dev server (localhost:5173)
  - `npm run build` — production build to `sim/dist/`
  - `npm run test` — Vitest (unit + integration + stress)
  - `npm run test:watch` — Vitest in watch mode
  - `npm run test:e2e` — Playwright browser tests
- **Theming**: CSS custom properties in `index.html :root` (`--bg-primary`, `--color-grass`, etc.)
- **Two-layer architecture**:
  - **Framework** (`sim/src/framework/`) — generic ABM engine, renderer, controls, registry
  - **Models** (`sim/src/models/<name>/`) — specific simulations (wolf-sheep, etc.)
- **Layer rule**: Framework must NEVER import from models. Models import framework types only.
- **Enforcement**: ESLint `no-restricted-imports` — engine/model code cannot import DOM modules
- **Headless mode**: `npx tsx sim/src/cli/run.ts` — engine has zero DOM dependencies

> **CARDINAL RULE — ALL AGENTS**: No errors, warnings, or lint issues may be suppressed. No `// eslint-disable`, no `@ts-ignore`, no `catch {}` that swallows errors, no `--no-verify`, no `console.error` without re-throwing. Every warning is a signal — investigate and fix the root cause, never silence it. This applies to all workflows, all agents, all phases.

## 2. Before Any Edit — MANDATORY

Before touching any file, complete this checklist:

0. **Consult learnings** — Read `references/learnings.md` and apply all rules listed there
1. **Read the file** being modified AND its colocated `.test.ts` file
2. **Read `types.ts`** and **`model-registry.ts`** if touching anything in `framework/`
3. **Read `definition.ts`** if touching a model
4. **Run `npm run test`** from `sim/` to confirm the baseline passes
5. **Search for existing abstractions** — never duplicate what already exists
6. **Identify the correct layer** — is this a framework change or a model change?
7. **Check recent git log** for the file — follow current patterns, not legacy ones

```bash
# Quick baseline check
npm run test -- --run
npx tsc --noEmit
```

## 3. Workflows

### Bug Fix

1. Write a **failing test first** that reproduces the bug: `it('regression: <description>')`
2. Confirm the test fails **for the right reason** (not a typo or import error)
3. Fix the code — make **ONE targeted fix**, not a rewrite
4. Confirm the regression test passes + **full suite passes**
5. The regression test stays forever — never delete it

### New Feature

1. Determine the correct layer (framework vs. model)
2. Define the **interface/type signature first** before implementation
3. Write tests **alongside** implementation (colocated `*.test.ts`)
4. Update `configSchema` in `definition.ts` if adding user-facing parameters
5. Ensure output is agent-readable (see `references/agent-readable-output.md`)
6. Run the full suite including E2E: `npm run test && npm run test:e2e`

### Refactor

1. Ensure **full test coverage BEFORE** refactoring — add missing tests first
2. Refactor in small, testable steps — run tests after each step
3. Never batch refactoring — one extraction or move per step
4. If a test breaks, the last step was too large — revert and split it

### New Model

Follow `references/new-model-guide.md` for the complete step-by-step process.

### Parameter Validation

When adding or tuning model parameters:
1. **If a canonical NetLogo model exists**: Use its parameter defaults and ranges as the baseline. Document the source URL in `creditUrl`.
2. **If no canonical model exists**: Use the `research` skill (nlm-backed) to research the model domain, validate parameter ranges against literature, and document assumptions in the definition's `info` fields.
3. **For our extensions** (parameters not in the original): Document why they exist and how defaults were chosen in the `info` tooltip text.

## 4. Architecture Rules

- Framework (`sim/src/framework/`) must **never** import from `sim/src/models/`
- Models (`sim/src/models/<name>/`) import framework types only (from `../../framework/`)
- New models register via `registerModel()` in their `definition.ts`
- All model state lives in the `BaseWorld` subclass — no global mutable state
- Behaviors are **pure functions** (input -> output, no side effects, no DOM)
- Engine/model code must have **zero DOM dependencies** (verifiable via `npx tsx sim/src/cli/run.ts`)
- The Mermaid architecture diagram in `references/architecture.md` **MUST be kept up-to-date** — any change to files or imports requires updating the diagram
- See `references/architecture.md` for full data flow and visual diagram

## 5. TypeScript Strictness

- All strict flags enabled (see `sim/tsconfig.json`)
- **No `any`** — use `unknown` + type narrowing (see `isWolfSheepState` in `world.ts` for the pattern)
- **No type assertions (`as`)** except the canvas mock pattern in tests
- All exported function parameters and return types must be **explicitly typed**
- Use `readonly` arrays where mutation is not needed (see `behaviors.ts` parameter signatures)
- Run `npx tsc --noEmit` as part of every verification loop

## 6. Testing Requirements

Testing pyramid (proven approach from initial build — 63 tests across 5 levels):

```
         +----------+
         | E2E (7)  |  Playwright — real browser, real canvas pixels
         +----------+
         | QA  (10) |  Vitest — stress, oscillation validation, build
         +----------+
         | UI  (12) |  Vitest + jsdom — renderer/controls with mock ctx
         +----------+
         |Engine(26)|  Vitest — pure function unit tests, no DOM
         +----------+
         | Vec2 (8) |  Vitest — pure math functions
         +----------+
```

- **Every change MUST include tests**
- Unit tests (~70%): pure functions, state transitions, utilities
- Integration tests (~20%): cross-module wiring, registry -> world -> render
- Playwright E2E (~10%): real browser, real pixels
  - `npx playwright test` for automated browser testing
  - Smoke: page loads, canvas renders, controls respond
  - Visual regression: `toHaveScreenshot()` with baselines in `sim/test/screenshots/`
  - Cross-browser: Chromium, Firefox, WebKit
  - Responsive: desktop + mobile viewports
- Stress tests: 1000-tick stability, population bounds, NaN checks (`sim/src/stress.test.ts`)
- Bug-fix tests: `it('regression: <description>')` — stays forever
- See `references/testing-strategy.md` for full patterns and examples

## 7. AI Guardrails

- **NEVER** duplicate existing logic — search for abstractions first
- **NEVER** propagate patterns from deprecated/old code — check git recency
- **NEVER** add dead code, unused imports, or speculative features
- **NEVER** weaken error handling or remove edge-case coverage
- **NEVER** write tests that only assert code runs — assert **behavior and invariants**
- **NEVER** accept "exit code 0" alone as passing — verify actual test assertions
- **NEVER** suppress errors or warnings (`// eslint-disable`, `@ts-ignore`, empty `catch {}`, `--no-verify`) — fix root causes
- If you cannot explain **WHY** a line of code exists, do not write it
- Prefer minimal, precise changes over large rewrites (AI code is 2x more likely to churn)
- See `references/ai-guardrails.md` for the full anti-pattern table with evidence

## 8. Commenting Standards

- Code MUST be **self-documenting first** (clear names, small functions, explicit types)
- Comments explain **WHY**, never WHAT
- **File-level docstring** on every file (1-3 lines: purpose, dependencies, constraints)
- **Contract comments** at framework-model boundaries (lifecycle hooks, mutation rules, ordering)
- **`TODO(agent):`** prefix for deferred improvements with a clear trigger condition
- **Invariant comments** for rules the type system cannot enforce
- Keep comments updated — stale comments are worse than none
- See `references/commenting-standards.md` for examples from the actual codebase

## 9. Agent-Readable Output

- All interactive elements must have `data-*` attributes for programmatic access
- Parameter names in the DOM must match code variable names (e.g., `data-param="wolfSpeed"`)
- Simulation state should be readable from the DOM (`#tick-display`, `#pop-wolves`, `#pop-sheep`, `#pop-grass`)
- HTML must be semantic (proper headings, `<label>` elements, ARIA where needed)
- The Web Fetch tool or Playwright MCP can verify the live app at `localhost:5173`
- See `references/agent-readable-output.md` for the full specification

## 10. Complete Cycle

Every code session starts and ends with this cycle. Do not skip phases.

### Phase 0: Setup
- Confirm sandbox is enabled with auto-edit on. If not, ask user:
  **"Please enable sandbox with auto-edit before we begin: run `/sandbox` and allow edits."**
- Do not proceed until sandbox is confirmed.

### Phase 1: Plan
- If a review report exists at `sim/review-report.md`, read it — its findings become the task list
- Classify each task: bug-fix | new-feature | new-model | refactor | UI-change
- Complete §2 mandatory checklist (read files, run baseline, search for existing abstractions)
- For **new-model**: invoke the `research` skill first to produce a model brief
- For **parameter validation** (new or tuned parameters): invoke the `research` skill to validate defaults and ranges against literature/canonical models (e.g., NetLogo). Document sources in `creditUrl` or `info` tooltip.
- For non-trivial changes: outline approach, confirm with user before implementing

### Phase 2: Implement
- Follow the matching §3 workflow (bug-fix, new-feature, refactor, new-model)
- Prefer minimal, targeted edits over rewrites
- **When 4+ independent files change**: use git worktrees for parallel work.
  Spawn agents from `.claude/agents/` with `isolation: "worktree"`:
  - Group changes by dependency — independent files run in parallel worktrees
  - Serialize only true dependencies (type changes before code using them)
  - Continue on main tree while worktree agents run in background

### Phase 3: Verify
All commands run from `sim/`:

    for iteration in 1..10:
        run: npx vitest run
        if ALL pass:
            run: npx tsc --noEmit
            run: npx eslint src/ --max-warnings 0
            if all pass → run E2E
        else:
            read first failing test error (first 50 lines)
            make ONE targeted fix
            continue
    if stuck after 10 iterations: simplify approach, retry 3 more

    # After unit/lint pass, run extended checks + E2E
    run: npm run lint:all    # eslint + knip (dead code) + type-coverage
    run: npx playwright test
    if failures → fix and re-run (same loop logic)

- Never skip a step. Never mark done until vitest + tsc + lint:all + playwright all pass.
- If a test is flaky, fix the flakiness — do not retry and hope.
- **Fix all linting errors** — even if they pre-date your changes. Zero warnings policy applies to the entire codebase, not just your diff.
- **Parallel option**: spawn `verify` agent in a worktree for independent validation while continuing fixes on main tree.

### Phase 4: Preview
1. Check dev server: `curl -s -o /dev/null -w "%{http_code}" http://localhost:5173`
2. If not running: `cd sim && npx vite &` — poll with curl each second, up to 5s
3. Open `http://localhost:5173` for the user
4. For UI changes: also invoke `ui-review` skill to spin up a playground for structured feedback
5. For pure engine changes with no visual impact: skip preview with explicit note
6. Ask: **"All checks pass. Please verify at http://localhost:5173 — approve to push."**

### Phase 5: Ship
When user approves ("LGTM", "looks good", "ship it", "approved"):
1. Invoke `/commit` — stages explicitly, commits, pushes
2. GitHub Actions deploys to Pages on push to main
3. Report commit hash + push status
4. Ask: **"Any feedback to save as a learning?"**
5. If feedback: append to `references/learnings.md` (one rule per entry, no duplicates)

### Cardinal Rule
No errors, warnings, or lint issues may be suppressed. No `// eslint-disable`,
no `@ts-ignore`, no `catch {}` that swallows errors, no `--no-verify`.
Every warning is a signal — investigate and fix the root cause.
