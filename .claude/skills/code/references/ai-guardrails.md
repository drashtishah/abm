---
title: AI Guardrails
description: Anti-patterns observed in AI-generated code with evidence and prevention rules.
---

## Why This Exists

AI coding assistants introduce specific categories of technical debt that differ from human-authored debt. Research (GitClear 2024, Google internal studies) shows AI-generated code has 8x more duplication, is 2x more likely to be quickly revised, and tends toward shallow implementations that pass CI but miss edge cases. These guardrails exist to prevent those patterns in this codebase.

## Anti-Pattern Table

| # | Anti-Pattern | Evidence | Prevention Rule |
|---|---|---|---|
| 1 | **Duplication over abstraction** | 8x increase in duplicated code in AI-assisted repos (GitClear 2024). AI re-implements rather than discovering existing functions. | **Search for existing functions before writing new code.** Use grep/search to find related abstractions. Extract shared logic at 3+ repeated lines. If you find yourself writing something that feels familiar, it probably already exists. |
| 2 | **Context blindness** | AI edits files in isolation without understanding how they connect. Changes to `world.ts` that break assumptions in `behaviors.ts`. | **Read ALL files in the change surface before editing any.** If modifying `world.ts`, also read `behaviors.ts`, `agent.ts`, and their tests. Follow the import graph. |
| 3 | **Bad pattern propagation** | AI copies patterns from the first matching example, even if that example is deprecated or non-idiomatic. | **Follow patterns from recently-modified files.** Check `git log --oneline <file>` to verify the pattern is current. Prefer patterns from files edited in the last 5 commits over older files. Check CLAUDE.md and SKILL.md for canonical patterns. |
| 4 | **Refactoring avoidance** | AI adds new code but never restructures existing code. Functions grow unbounded. Files accumulate unrelated responsibilities. | **After each feature, evaluate whether extraction or splitting would help.** If a function exceeds 40 lines, consider splitting. If a file handles multiple concerns, consider extracting. Refactoring is not optional — it is part of the feature. |
| 5 | **Shallow error handling** | AI omits failure modes, writes empty `catch {}` blocks, or logs errors without re-throwing. Errors vanish silently. | **For every new function, document what can go wrong.** Every `catch` must either re-throw, return an error value, or handle the specific error with a comment explaining why swallowing is safe. Empty `catch {}` is NEVER acceptable. |
| 6 | **Weak tests** | Tests that assert "it runs without crashing" rather than verifying behavior. `expect(fn()).toBeDefined()` instead of `expect(fn()).toEqual(expectedResult)`. | **Every assertion must verify behavior or an invariant.** Not "it doesn't crash" but "wolf moves toward nearest sheep". Not "output exists" but "output has the correct structure and values". If a test would still pass with a no-op implementation, the test is worthless. |
| 7 | **Cognitive debt** | AI writes code that is syntactically correct but nobody can explain. Complex ternaries, opaque variable names, unexplained magic numbers. | **Rewrite any line you cannot explain.** If you write a line and cannot articulate why it exists and what would break if removed, delete it and write something clearer. Prefer boring, obvious code over clever code. |
| 8 | **Code churn** | AI-generated code is 2x more likely to be revised within 2 weeks (GitClear 2024). Large rewrites create large revert surfaces. | **Prefer minimal, precise changes over large rewrites.** Change the fewest lines necessary. If a fix requires touching more than 3 files, pause and verify the approach. Small changes are easier to review, test, and revert. |
| 9 | **Over-engineering** | AI adds unnecessary abstraction layers, wrapper functions, factory factories, or generic solutions for specific problems. | **Only abstract when 3+ concrete use cases exist.** Do not create a `BaseAnimalFactory` when you only have wolves and sheep. Do not add generic type parameters unless two distinct types actually use the generic. YAGNI applies doubly to AI code. |
| 10 | **Comment rot** | AI writes comments that describe WHAT code does (`// increment counter`) instead of WHY. These comments go stale immediately when code changes. | **Only write "why" comments.** Delete any comment that merely restates the code. If the code is unclear without a "what" comment, rename the variable or extract a function instead. See `references/commenting-standards.md`. |
| 11 | **Error suppression** | AI adds `// eslint-disable-next-line`, `@ts-ignore`, `@ts-expect-error`, empty `catch {}`, or `--no-verify` to make problems disappear rather than fixing them. | **NEVER suppress warnings or errors.** Every suppression hides a real problem. If ESLint complains, fix the code. If TypeScript has a type error, fix the type. If a test fails, fix the implementation. If a pre-commit hook fails, fix what it caught. The ONLY exception is the canvas mock `as unknown as CanvasRenderingContext2D` pattern in tests. |

## Quick Reference: Before Every Change

1. Did I **search** for existing code that does this? (Anti-pattern 1)
2. Did I **read all related files** before editing? (Anti-pattern 2)
3. Is the pattern I am following from a **recent, canonical source**? (Anti-pattern 3)
4. Does this change leave the codebase **better structured** than before? (Anti-pattern 4)
5. Have I handled **all failure modes**? (Anti-pattern 5)
6. Do my tests verify **behavior**, not just existence? (Anti-pattern 6)
7. Can I **explain every line** I wrote? (Anti-pattern 7)
8. Is this the **smallest change** that solves the problem? (Anti-pattern 8)
9. Am I solving a **real problem** or a hypothetical one? (Anti-pattern 9)
10. Do my comments explain **why**, not what? (Anti-pattern 10)
11. Did I **fix** every warning, or did I suppress any? (Anti-pattern 11)
