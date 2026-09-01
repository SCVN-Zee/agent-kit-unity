---
description: "Triggers when edit/write targets a corruptible Unity asset (.prefab, .unity, .controller, .anim, .mat, .playable, or .signal). Stop the raw mutation and redirect it to the connected Unity MCP; this is a TTSR safety guard, not general domain routing."
scope: [tool:edit, tool:write]
globs: ["**/*.prefab", "**/*.unity", "**/*.controller", "**/*.anim", "**/*.mat", "**/*.playable", "**/*.signal"]
condition: ["[\\s\\S]"]
interruptMode: tool-only
---

STOP — you are about to `edit`/`write` a Unity asset file that corrupts on hand-edit (`.prefab .unity .controller .anim .mat .playable .signal`). A plain text edit breaks its FileID webs, prefab-apply chains, and serialization.

Do not edit the serialized file. Route this mutation per the policy table's designated channel for this op family (`rule://aku-mcp-policy`): CLI-live only where the table marks it primary, else the connected Unity MCP — bind the matching capability already in your in-context tool list (scene/prefab/asset/animator/material); if neither channel is available, make the change in the Editor or via a committed-state `git` op — not by editing the serialized file; if no channel exists at all, pause this asset work.

Full policy: `rule://aku-mcp-policy`. Focused workflows: `skill://aku-scene`, `skill://aku-prefab`, and `skill://aku-animator`.
