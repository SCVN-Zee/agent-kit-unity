---
description: "Use when a Unity task requests subagents, delegation, or parallel execution. Parallelize independent read-only investigation; serialize Unity Editor mutations, connected-MCP writes, and C# changes sharing a compile unit."
---

# Parallel Orchestration Rule

**Default: parallelize.** When subtasks are independent, fan them out. Sequential dispatch only when correctness forces it.

## Parallelize (default ON)

- Research / scout / read-only investigation across files or topics
- Independent doc reads, code analysis, lint runs
- Non-conflicting artifact generation (separate reports, disjoint file edits)
- Cross-cutting reviews where each reviewer reads, doesn't write

## Serialize (correctness gate)

- Edits to overlapping files / directories (race → lost writes)
- **Unity Editor mutations via the connected Unity MCP's write capabilities** — scene, GameObject, asset, prefab-stage, object-patch, animator families. The Editor is single-threaded; the MCP server serializes anyway. Concurrent dispatch adds corruption risk + requestId interleaving, no speedup.
- C# edits sharing a compilation unit — serialize them; a shared compile unit is a hard data dependency.
- DB migrations, git ops on same branch, any step with a hard data dependency.

## Execution

1. Decision: do tasks share files / state? Yes → serialize. No → parallel.
2. Parallel dispatch: one wave of independent subagents.
3. Declare per-subagent file ownership in the prompt. No overlap.
4. Lead synthesizes after parallel completion. Serial merge.

## Anti-patterns

- Sequential dispatch for disjoint work (wasteful)
- Parallel dispatch for overlapping writes (corruption)
- Parallel Unity MCP write ops (Editor corruption, requestId interleaving, no speedup)
- "I'll go sequential to be safe" without checking dependency
