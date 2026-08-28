---
description: "Triggers when blanket staging or commit commands run in a concurrent-session repository, including git add -A, git add ., or git commit -a. Stop the command so foreign in-flight edits are not swept in; explicit-path staging remains valid."
scope: [tool:bash]
condition: ["git\\s+add\\s+-A", "git\\s+add\\s+--all", "git\\s+add\\s+\\.(\\s|$)", "git\\s+commit\\s+-[a-z]*a"]
interruptMode: tool-only
---

STOP — this repo declares **concurrent sessions**, and you are about to blanket-stage the working tree (`git add -A` / `git add .` / `git commit -a`). Another session's in-flight edits may be sitting in the tree; a blanket stage sweeps them into your commit.

**Decide per commit — detect foreign work first, then restrict staging only if it exists:**

1. Show every pending change: `git status --short && git diff --stat`.
2. Identify which paths THIS session actually touched — from your own `edit` / `write` / connected-Unity-MCP write history this session. Include the `.unity` / `.prefab` / `.asset` files your MCP writes changed, plus a paired `.meta` **only when you created or modified its paired asset**.
3. `foreign = (pending paths) − (paths this session touched)`. A `.meta` whose asset this session did not touch is foreign.

**Then:**

- **No foreign paths** → nothing to sweep. `git add -A` / `git add .` / `git commit -am` are fine — commit normally. (Common case for a solo session on a concurrency-declared repo. You may now re-run the command you intended.)
- **Foreign paths present** → stage only this session's explicit paths (`git add <path> <path> …`), list the foreign paths to the user, then commit. Never `git add -A` / `git add .` / `git add <dir>`, or `git commit -a` / `git commit -am` here (`commit -a` bypasses the index).
- **Ownership genuinely ambiguous** for a path → ask the user before staging it. Do not guess.

Delegating a commit to a fresh-context agent (e.g. a git specialist)? It cannot see this session's edits, so it cannot compute the foreign set. If foreign paths exist, pass it the explicit file list and instruct: show the diff, stage only those paths, never `git add -A`.
