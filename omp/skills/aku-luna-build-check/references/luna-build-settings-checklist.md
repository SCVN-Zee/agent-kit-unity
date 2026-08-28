# Luna Build-Settings Checklist

House rules for Luna Playworks export settings, mapped to their `luna.json` paths.

> **Source of truth:** the machine-readable rules live in `../scripts/luna-build-settings.cjs`
> (`BOOL_GATES` + `ADVISORIES`). This doc mirrors them for humans and for the guided fallback —
> keep the two in sync. The validator, not this table, is authoritative at runtime.

Settings come from the Luna Build window (**Settings** tab: Basic/Advanced; **Assets** tab:
Textures/Sound/Fonts/Meshes/Animations). The **Assets → Assets** sub-list is manual and out of scope.

## 🔴 Gates (must pass — auto-fixable except scene)

| Setting | `luna.json` path | Required | Auto-fix | Why |
|---|---|---|---|---|
| Exactly 1 scene | `unity.scenes` − `unity.disabledScenes` | exactly **1 enabled** | no (validate-only) | A playable is one self-contained scene; multi-scene loading is unsupported and bloats the build. Can't auto-pick which scene → manual. |
| Force-disable Anti-Aliasing OFF | `unity.disableAntiAliasing` | `false` | yes | Keep AA so the playable preserves intended visual quality (no jagged edges in the ad). |
| Mesh half-precision OFF | `assets.rules.meshes.default.halfPrecision` | `false` | yes | Half-precision vertices introduce precision artifacts (and WebGL 1 unpacks them at startup) — not worth the marginal size saving. |
| Mesh reduce-complexity OFF | `assets.rules.meshes.default.useSimplification` | `false` | yes | Decimation warps geometry; preserve mesh fidelity. |
| Animation half-precision OFF | `assets.rules.animations.default.halfPrecision` | `false` | yes | Half-precision causes motion jitter/snapping; preserve animation fidelity. |
| Animation remove-redundant-keyframes OFF | `assets.rules.animations.default.stripCurves` | `false` | yes | Keyframe stripping can drop subtle motion; keep curves intact. |

## 🟡 Advisories (report-only — judgment calls, never auto-set)

| Setting | `luna.json` path | House reference | Why / when to deviate |
|---|---|---|---|
| Realtime shadows | `unity.enableRealtimeShadows` | `false` (default OFF) | Realtime shadows are costly on WebGL playables; enable only if the creative genuinely needs them. |
| Sound default bitrate | `assets.rules.sound.default.bitrate` | `96` kb/s | Balances size vs quality. Lower to shrink the build, raise for quality-critical audio. Per-clip `sound.overrides[]` are intentional. |
| Font atlas size | `assets.rules.font.default.data.textureWidth` / `textureHeight` | `256` × `256` | Sufficient for typical short playable copy; enlarge only for many or large glyphs. |
| Texture default + overrides | `assets.rules.texture.default` (maxWidth/Height, format, compression, quality) + `assets.rules.texture.overrides[]` | default keeps build small | Global downscale/compression shrinks the bundle (textures dominate playable size); bump hero/high-detail textures via per-asset `overrides[]` for sharpness. The skill reports the default + override count and reminds you to override hero textures — it cannot know which textures "need" higher res. |

## Notes

- **`overrides[]` are sacred.** Auto-fix only edits `*.default` gate scalars; per-asset overrides are
  intentional tuning and are never touched.
- **Missing keys** are reported as `missing` (not failed) and are never created automatically — add them
  in the Luna UI, then re-run.
- **`LunaTemp/`** holds a *generated* `luna.json`; always validate/fix the **source** `luna.json` at the
  Unity project root, not the `LunaTemp/` copy.
