# Surface — Luna Playable Compatibility (Tier 1 source · Tier 2 asset-MCP)

Luna (Playwork) transpiles C# → JavaScript via **Bridge.NET** and runs on Luna's own lightweight WebGL runtime
(not the Unity player). Luna's export **diagnostics** already flag most asset/config problems as `LP####` codes
in the plugin UI — so this lens targets what they miss: **source-static transpile risks + silent
Bridge.NET / WebGL semantic traps that compile clean AND pass export but still misbehave.** **Report-only** —
never edit; route fixes to the engineer kit. Tag every finding lens `luna`.

**When this runs:** only on a Luna project — `luna.json` present, Luna/Playworks in `Packages/manifest.json`
or `Assets/Luna/`, a diff under `**/Playable*/`, or the prompt names Luna. Otherwise skip silently.

**Authority:** the project's `luna.json` + the installed Luna version are the source of truth for the *volatile*
whitelist — many items below are version/config-dependent, so verify before hard-failing. Official docs:
`getting-started/limitations`, `supported-features/mecanim`, `shaderlab-features`, `code/error-codes` —
<https://docs.lunalabs.io/docs/playable/>

## Tier 1 — source-static (.cs / .shader; offline)

### Officially unsupported — will not run / will not transpile

| Hazard | Why | Luna-safe fix |
| --- | --- | --- |
| Precompiled **DLLs / native plugins** | source C# only; not transpiled | ship source C#; stub SDKs behind `#if !UNITY_LUNA` |
| **Odin Inspector attrs** (`Sirenix.OdinInspector.*`) + the `using`, unguarded in `.cs` | Odin is a precompiled DLL — same class as above; the transpile chokes on the Sirenix reference (**critical** — build break) | wrap attrs + `using` in `#if UNITY_EDITOR && ODIN_INSPECTOR`; keep `[SerializeField]` OUTSIDE the guard. Display attrs only — `SerializedMonoBehaviour`/`[OdinSerialize]` is a separate runtime-serialization problem |
| **`[Required]` / `[RequiredIn]` sharing a bracket with `[SerializeField]`** — `[SerializeField, Required]` | unguardable: a `#if` cannot wrap part of a bracket, so the attr cannot be stripped without stripping the field, which kills serialization (**critical** — build break, and the highest-volume case since `skill://aku-code-conventions/REQUIRED_FIELDS.md` mandates the attr on every serialized ref) | split to `[Required]` on its own line above `[SerializeField]`, then guard only the `[Required]` line |
| **Odin picker provider** — the `nameof(GetX)` target of `[ValueDropdown]`/`[ShowIf]`/`[ValidateInput]` — referencing `UnityEditor*` **unguarded** | the provider is ordinary runtime C#; the Sirenix *attribute* guard does not cover it, so the transpile still hits `InternalEditorUtility` / `AnimatorController` / `AssetDatabase` (**critical** — build break) | guard the provider **body**, never the whole method: `#if UNITY_EDITOR` … `#else return new T[0]; #endif` (plain array creation — `Array.Empty<T>()` is an undocumented BCL surface on Bridge.NET). A fully `#if`-stripped method still compiles on Luna, since the attr is stripped too — but it breaks **non-Luna player builds** (`nameof` can't resolve a stripped member), so keep one shape for both. See `skill://aku-code-conventions/BOUNDED_DOMAIN_FIELDS.md` + `skill://aku-code-conventions/examples/bounded-domain-fields.md` recipe 7 |
| **NavMesh** (built-in) | unsupported | C# A* pathfinding |
| **DOTS / ECS** | unsupported | classic MonoBehaviour |
| **HDRP** | unsupported | URP or Built-in RP |
| **C# 7.1+** language features | Bridge.NET ≈ C# 7.0 (some newer via Compiler V2 — verify) | stay within C# 7.0 syntax |
| `AsyncOperation` (async scene/resource load) | unsupported | single scene, preloaded assets |
| Reserved / incompatible **identifier names** + special characters | transpile fail (`LP3005` illegal keyword) | rename per `code/incompatible-names` |

### Supported but risky — verify per project (Bridge.NET / WebGL / ad-network policy)

| API / pattern | Reality in Luna | Guidance |
| --- | --- | --- |
| `async` / `await` | **officially supported** (parallel, `Task<T>`, `async void Start()`); single-threaded — no real concurrency. **UniTask** is the failure point | use `async` or `IEnumerator`; avoid UniTask; don't assume parallelism |
| `System.Reflection` | `typeof` / `GetType` / `is` / `as` work; **deep** reflection does not | avoid `Reflection.Emit`, assembly/type scanning, private-member access |
| generic `T` types / nested generics (`List<List<T>>`, generic base class) | Bridge.NET generic projection is limited → runtime errors | keep generic shapes shallow; don't inherit generic bases |
| `UnityWebRequest` / outbound HTTP | API transpiles, but playables must be **self-contained** (ad-network policy + CORS) | bundle all data; no runtime fetches |
| `ParticleSystem.Clear(true/false)` (`Clear$1`) | **may** be excluded by a project's `luna.json` → silent no-op (particles stack on pool reuse) | prefer `Stop(true, StopEmittingAndClear)`; verify `luna.json` |
| Physics — `Rigidbody` / `Raycast` / colliders **SUPPORTED**; `SphereCast` unreliable, `CharacterController` flagged (`LP1033`), `Physics2D.MovePosition` quirky | works, but costly at the 60fps / 256 MB budget | use freely; verify SphereCast/CharacterController in a Luna build; custom AABB for hot loops is a **perf** choice, not a ban |

### Bridge.NET data traps — silent wrong value (no crash, no warning)

| Hazard | Why | Luna-safe fix |
| --- | --- | --- |
| `Dictionary<TStruct,_>` / `HashSet<TStruct>` (e.g. `Vector2Int` key) + `TryGetValue`/`ContainsKey` | struct equality → reference-eq → always misses | int/string/class key, or iterate `.Values` and compare members |
| `Camera.ScreenToWorldPoint` (for picking) | can return wrong coords (`z=0` → camera pos; Y-flip; iframe scaling; orthographic axis) | forward-project: `WorldToScreenPoint` each candidate, pick nearest in screen space |
| `[SerializeReference]` (polymorphic field) | exporter serializes by value → null / sliced at runtime | typed `[SerializeField]`, or SO + interface |

### Animator / Mecanim

**Officially unsupported (Luna docs) — avoid for new work; a given project may carry its own workaround:**
Blend Trees, Sub-State-Machines, Inverse Kinematics (IK). Humanoid avatars = **experimental, Forward-Kinematics
only**. The cross-fade blend distortion / "taffy stretch" traces back to these unsupported blend graphs.

| Hazard (in .cs) | Why | Fix |
| --- | --- | --- |
| Normal gameplay uses `Animator.Play` / `CrossFade` to reach a state | bypasses controller conditions and often hides a missing edge | add the typed parameter + entry/required-exit transitions; cache the parameter hash |
| direct-state code passes a numeric state index or `0` to `Animator.Play(int)` | the `int` overload expects a state-name hash; zero changes the current state's normalized time instead of naming a state | controller-backed `Layer.State` selection; cache the full-path hash + layer index, and state why transitions are unsuitable |
| `Animator.HasState(...)` | unreliable (always true / always false) | pre-validate at edit time; or toggle Animator `enabled` |
| `SetFloat/Bool/Int/Trigger("name", …)` to an **undefined** param | per-FixedUpdate warning spam → physics stall (Editor-silent) | cache `StringToHash`; audit the param exists at edit time |

### Shader source (.shader)

| Hazard | Why | Fix |
| --- | --- | --- |
| `#pragma shader_feature KW` toggled only at runtime via `EnableKeyword` | stripped unless a material has `KW` in `m_ValidKeywords` → silent no-op (magenta; `LP1001`) | `shader_feature_local`, or pin `KW` in a catch-all material |
| `#pragma target` > 3.0 | Luna supports target 2.0–3.0 (3.0 "limited") | target ≤ 3.0 |
| Unsupported ShaderLab tags — `RenderPipeline`, `DisableBatching`, `CanUseSpriteAtlas`, `PreviewType`; `Fallback` other than `ShadowCaster` | outside Luna's ShaderLab subset | drop the tag; `Fallback "ShadowCaster"` only |
| `_CameraDepthTexture` sampled in a custom shader | WebGL depth tex unreliable → `GL_INVALID_OPERATION`, frame breaks | approximate (fresnel via `normal·viewDir`); no depth sampling |
| `[Header(...)]` / `[Tooltip(...)]` with `- / ( )` | ShaderLab parser may reject non-alphanumeric (project-observed) | alphanumeric + spaces only |

### Lifecycle (.cs)

- Soap / `ScriptableEvent` channel subscribed in `OnEnable` → Luna pauses scenes between phases and the
  subscription can vanish. **Subscribe in `Awake`, unsubscribe in `OnDestroy`.**
- `event += h` / `pool.Register(...)` / `Init()` with no paired `-=` / `Unregister(...)` / `Release()` in
  `OnDestroy` → leak / double-subscribe. (General lifecycle = Lens 2; flag here only when Luna-pause-specific.)
- Interface ref to a Unity object called without an `(obj as Object) == null` guard → destroyed-but-not-GC'd.

### Grep triage (review each hit — not all are bugs)

```
grep -rn "UniTask\|System.Reflection\|UnityWebRequest\|SerializeReference\|AsyncOperation" --include=*.cs
grep -rn "Dictionary<Vector\|Dictionary<[A-Za-z]*Int\|HashSet<Vector" --include=*.cs
grep -rn "\.Clear(true)\|\.Clear(false)\|ScreenToWorldPoint\|\.Play(0)\|HasState\|SphereCast" --include=*.cs
grep -rn "Sirenix\|OdinInspector\|\[Required\|\[BoxGroup\|\[FoldoutGroup\|\[Title(\|\[LabelText\|\[ShowInInspector\|\[Button" --include=*.cs  # each hit MUST sit inside #if UNITY_EDITOR && ODIN_INSPECTOR; "\[Required" catches [RequiredIn too
grep -rn "InternalEditorUtility\|UnityEditor.Animations\|AssetDatabase" --include=*.cs  # in a ValueDropdown/ShowIf provider? body MUST be #if-guarded, method MUST NOT be
grep -rn "_CameraDepthTexture\|#pragma target" --include=*.shader
```

`SerializeReference`, struct-keyed dicts, `_CameraDepthTexture`, blend trees, unguarded Odin/`Sirenix` attrs → near-certain bugs (Odin = transpile break).
`async`/`UniTask`, `UnityWebRequest`, `Clear(bool)`, `Physics.*` → verify against `luna.json` + Luna version,
not auto-fail.

## Tier 2 — asset state (read-only MCP)

Run only with a live Editor. If none, note `luna asset-tier: skipped (no live Editor)` and treat all of this
as advisory. **Never mutate** — read-only; don't enter Play Mode for mutations.

Bind each capability to the Unity MCP tools already surfaced in your in-context tool list — match the capability, not a hardcoded name. If none matches, read via the Editor. Never hand-edit a serialized asset file.

### Automated (field exposed by MCP)

| Check | Capability | Flag when |
| --- | --- | --- |
| Animator culling | read component data (Animator) | `cullingMode == AlwaysAnimate` on a non-player animator → big frame-time cost. `CullCompletely` saves it but can break resume on return-to-viewport — verify; player stays `AlwaysAnimate` |
| Skinned offscreen update | read component data (SkinnedMeshRenderer) | `updateWhenOffscreen == true` on a non-player mesh → defeats culling; want `false` |
| `CharacterController` component | read component data | present → Luna flags `LP1033`; verify behavior + perf |

### Advisory (MCP may not expose the field — manual-inspect, never an automated "clean")

| Check | Hint capability | Inspect manually |
| --- | --- | --- |
| Blend Tree / Sub-State-Machine / IK in a controller | read animator data (animation MCP ext); fallback: call `AnimatorController` by reflection | any blend tree, sub-FSM, or IK pass → **officially unsupported**; expect breakage |
| Animator `WriteDefaults` | read animator data; fallback: call `AnimatorController.layers[].stateMachine.states[].state.writeDefaultValues` by reflection | every state `WriteDefaults = false` (official rec; WD-ON → skipped transitions), uniform across the controller |
| `shader_feature` stripping | read asset data (material) + list / read shaders | runtime-toggled keyword present in some material's `m_ValidKeywords`, else convert to `_local` |
| TMP atlas mode | read asset data (font asset) | font asset `m_AtlasPopulationMode == Static` (Dynamic unsupported — `LP1030`) |
| Cross-fade bone-set parity | manual only | no MCP tool exposes per-clip curves; clips blended together must key the same bone set (mismatch = "taffy stretch") |
| Null-motion / hidden flags | — | `.controller` for `m_Motion: {fileID: 0}`, `m_SpeedParameterActive: 0`, BlendTree child `m_TimeScale != 1` |

## Out of scope (Luna's export diagnostics / a real build own these)

Bundle size (2–5 MB cap), 256 MB RAM, realtime-shadow (≤1 directional) / draw-call / texture (≤1024) budgets,
65k-vtx mesh (`LP1034`), particle Rate-over-Distance *runtime* burst, actual Luna build & export — caught by
Luna's `LP####` export diagnostics or only provable in a real build. Note as "build-time, not reviewed here".

## Suppress (don't flag)

- Editor-only code (`#if UNITY_EDITOR` / `#if UNITY_EDITOR && ODIN_INSPECTOR` / `#if !UNITY_LUNA`) — never ships to / runs in Luna. Odin attrs guarded this way are correct, not a finding.
- A flagged API already wrapped in a Luna-safe guard or behind a non-Luna platform branch.
- Whitelist/version-volatile items the project's `luna.json` + Luna version explicitly allow (verify first).

## Reporting

Standard `skill://aku-code-review` format; tag lens `luna`; `file:line` + one-line fix; cite the `LP####` code when one
maps. If only the Luna lens ran, header `Luna Review:` + add `luna asset-tier: <ran|skipped>` to the verify line.
