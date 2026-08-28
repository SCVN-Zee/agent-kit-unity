---
description: "Triggers when edit/write targets a corruptible Unity asset (.prefab, .unity, .controller, .anim, .mat, .playable, or .signal). Stop the raw mutation and redirect it to the connected Unity MCP; this is a TTSR safety guard, not general domain routing."
scope: [tool:edit, tool:write]
globs: ["**/*.prefab", "**/*.unity", "**/*.controller", "**/*.anim", "**/*.mat", "**/*.playable", "**/*.signal"]
condition: ["[\\s\\S]"]
interruptMode: tool-only
---

STOP — you are about to `edit`/`write` a Unity asset file that corrupts on hand-edit (`.prefab .unity .controller .anim .mat .playable .signal`). A plain text edit breaks its FileID webs, prefab-apply chains, and serialization.

Route this mutation through your **connected Unity MCP** instead — bind to the matching capability already in your in-context tool list (scene/prefab/asset/animator/material). If no Unity MCP tool matches, make the change in the Editor or via a committed-state `git` op — not by editing the serialized file. If no Unity MCP is connected at all, pause this asset work.

Full policy: `rule://aku-mcp-policy`. Focused workflows: `skill://aku-scene`, `skill://aku-prefab`, and `skill://aku-animator`.
