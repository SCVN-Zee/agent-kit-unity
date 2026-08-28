---
description: "Use when work needs a capability this Unity-only kit does not provide, including C# authoring, planning, implementation, testing, generic review, journaling, or shipping. Choose the best installed skill, then use the documented native fallback; never invent an absent command."
---

# Capability Routing

This kit is **standalone**. It ships Unity handling only and names just its own `aku-*` skills. Everything else — authoring C#, planning, implementing, testing, reviewing generically, journaling, shipping — is a **capability the agent routes at runtime**, never a hardcoded sibling-kit command.

## The convention

Resolve each needed capability against the **live installed-skill catalog** the runtime presents this session:

1. Match the work to a capability below.
2. Use the best-matching **installed** skill for it (a matching installed skill is always preferred over the native fallback).
3. If none is installed, use the **native fallback** — plain tools, plan mode, `edit` on `.cs` — and keep applying this kit's Unity conventions.
4. **Never synthesize an absent command.** Do not emit another kit's slash command as if it exists; route by capability, not by name.

`aku-*` self-references are exempt — those skills ship with this kit and are always present (`skill://aku-scene`, `skill://aku-prefab`, `skill://aku-animator`, `skill://aku-code-conventions`, `skill://aku-asset-conventions`, `skill://aku-odin`, `skill://aku-code-review`, and friends). Cite them directly via `/skill:aku-<name>`.

## Capability map

| Work at hand | Capability to route (installed skill) | Native fallback if none |
|--------------|----------------------------------------|-------------------------|
| Author / edit a `.cs` script (out of this kit's scope) | C# authoring / implementation | plan mode + plain `edit` on the `.cs` |
| Frame a feature, compare approaches | brainstorm / design | state the outcome + acceptance inline, then proceed |
| Produce a phased implementation plan | planning | write a plan file under `plans/` by hand |
| Drive an accepted plan to completion | implementation / cook | execute the plan file step by step |
| Locate code, trace a repo | scouting / search | native `grep` / `glob` / `read` |
| Generic (non-Unity) review machinery that `skill://aku-code-review` layers on | code review | run `aku-code-review`'s own checklist directly |
| Validate via tests | testing | run the project's test command directly |
| Record a durable technical journal entry | journaling / decision capture | append a dated note under the repo's journal/docs location |
| Merge / release | shipping / release | native `git` + `gh` |

## Coexistence, not dependency

A sibling kit may supply several of these capabilities; when present, its skills win the match above. When absent, nothing breaks and nothing nags — the native fallback carries the work. This kit assumes no specific sibling kit is installed.
