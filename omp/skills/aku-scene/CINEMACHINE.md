# Cinemachine via Core Tools (no MCP extension)

No dedicated Cinemachine capability is assumed on the connected server. All camera work goes through core capabilities (create a GameObject, add/read/modify a component, run an editor-side C# snippet, reflection). Determine the installed major version from the project package manifest or the available component types: **CM2** → recipes below; **CM3** → [Cinemachine 3 projects](#cinemachine-3-projects).

> **Runtime binding:** bind each capability below to the Unity MCP tools already in your in-context tool list — match the capability, not a hardcoded name.

## CM3 ↔ CM2 vocabulary

| CM3 name | CM2 equivalent |
| --- | --- |
| namespace `Unity.Cinemachine` | `Cinemachine` |
| `CinemachineCamera` | `CinemachineVirtualCamera` (orbital: `CinemachineFreeLook`) |
| `CinemachineFollow` (Body) | `CinemachineTransposer` |
| `CinemachinePositionComposer` (Body) | `CinemachineFramingTransposer` |
| `CinemachineRotationComposer` (Aim) | `CinemachineComposer` |
| `CinemachineOrbitalFollow` | `CinemachineOrbitalTransposer` / `CinemachineFreeLook` 3-rig |
| `CinemachinePanTilt` (Aim) | `CinemachinePOV` |
| `CinemachineSplineDolly` | `CinemachineTrackedDolly` + `CinemachinePath` / `CinemachineSmoothPath` |
| `CinemachineDeoccluder` | `CinemachineCollider` |
| `CinemachineConfiner3D` | `CinemachineConfiner` |
| properties `Lens` / `Follow` / `LookAt` / `Priority` | public fields `m_Lens` / `m_Follow` / `m_LookAt` / `m_Priority` |

CM2 serializes through `m_`-prefixed **public fields** → address them via the `fields` channel when applying a component patch, never `props`.

## Camera intents → CM2 recipes

| Intent | CM2 recipe (core capabilities) |
| --- | --- |
| Create a vcam | create a GameObject, then add component `Cinemachine.CinemachineVirtualCamera` (orbital: `Cinemachine.CinemachineFreeLook`) |
| Ensure brain on the Main Camera | list the Main Camera's components; if absent, add component `Cinemachine.CinemachineBrain` |
| Inspect cameras (list / read) | find a GameObject + read component data / list its components |
| Set follow / look-at targets | apply a component patch: fields `m_Follow`, `m_LookAt` (object refs) |
| Set priority | apply a component patch: field `m_Priority` |
| Set lens (FOV, ortho size, clip planes) | apply a component patch: nested fields `m_Lens.FieldOfView`, `m_Lens.OrthographicSize`, `m_Lens.NearClipPlane`, …; if the nested struct write fails → editor-side C# snippet |
| Configure Body stage | editor-side C# snippet → `vcam.AddCinemachineComponent<CinemachineTransposer>()` (or `CinemachineFramingTransposer`, `CinemachineOrbitalTransposer`, `CinemachineTrackedDolly`, `Cinemachine3rdPersonFollow`) — see pipeline note |
| Configure Aim stage | editor-side C# snippet → `AddCinemachineComponent<CinemachineComposer>()` (or `CinemachinePOV`, `CinemachineHardLookAt`, `CinemachineSameAsFollowTarget`) |
| Configure Noise stage | editor-side C# snippet → `AddCinemachineComponent<CinemachineBasicMultiChannelPerlin>()` + assign `m_NoiseProfile` (NoiseSettings asset) |
| Default blend | apply a component patch on the brain: nested fields `m_DefaultBlend.m_Style`, `m_DefaultBlend.m_Time`; if the nested struct write fails → editor-side C# snippet |
| Add camera extension (collider, confiner, follow-zoom) | plain add-a-component on the vcam GameObject (`CinemachineCollider`, `CinemachineConfiner`, `CinemachineFollowZoom`, … self-register as extensions) |
| Any other property | apply a component patch (fields channel, `m_*` names); pipeline-component fields → editor-side C# snippet |

## Pipeline components (Body / Aim / Noise) — CM2

CM2 stage components live on a **hidden child** GameObject managed by `CinemachineVirtualCamera` — never add them with the add-a-component capability and never touch the hidden child directly. Go through the vcam API in an editor-side C# snippet:

```csharp
using Cinemachine;
using UnityEngine;

var vcam = GameObject.Find("VCam_Player").GetComponent<CinemachineVirtualCamera>();
var aim = vcam.AddCinemachineComponent<CinemachineComposer>();    // replaces the current Aim stage
aim.m_TrackedObjectOffset = new Vector3(0f, 1.5f, 0f);
var body = vcam.GetCinemachineComponent<CinemachineTransposer>(); // read/modify the existing stage
```

`CinemachineFreeLook` has no `AddCinemachineComponent` — configure per rig: `freeLook.GetRig(0)` (top) / `GetRig(1)` (middle) / `GetRig(2)` (bottom) each return a `CinemachineVirtualCamera`.

## Cinemachine 3 projects

CM3 restructured the API — no hidden child, no `m_` prefixes. Same core tools, different names:

- Namespace `Unity.Cinemachine`; the camera component is `CinemachineCamera` (replaces `CinemachineVirtualCamera`).
- Pipeline stages are **visible sibling components** on the camera GameObject (`CinemachineFollow`, `CinemachinePositionComposer`, `CinemachineRotationComposer`, `CinemachineOrbitalFollow`, `CinemachinePanTilt`, `CinemachineBasicMultiChannelPerlin`) — plain add-a-component works; no `AddCinemachineComponent` indirection.
- Serialized as **properties** (`Lens`, `Follow`, `LookAt`, `Priority`) → use the `props` channel when applying a component patch, not `fields`.
- Camera extensions (`CinemachineDeoccluder`, `CinemachineConfiner3D`, …) are also plain add-a-component on the camera GameObject.

## When unsure

- Component/field shape on any Cinemachine type: read the type's JSON schema.
- Member discovery / non-generic invocation: find a method by reflection → call it by reflection. Generic methods (`AddCinemachineComponent<T>`) → prefer an editor-side C# snippet.
- Permanent helper instead of a one-off snippet: author a permanent helper script.

## Version note

CM2 recipes target Cinemachine **2.8+** (recent LTS range). Older 2.x may lack `Cinemachine3rdPersonFollow` or individual fields — verify by reading the type's JSON schema before assuming.
