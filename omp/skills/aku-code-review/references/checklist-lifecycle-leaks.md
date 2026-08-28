# Lens 2 — Lifecycle & Leaks

MonoBehaviour lifecycle misuse and un-released references. Leaks here are mobile killers: managed objects pinned by event subscriptions, and **native** objects (Material/Texture/Mesh) that GC never collects.

## Awake / Start / OnEnable ordering

- External or cross-component access in `Awake` — execution order across objects is undefined. Allocate only self-state in `Awake`; do cross-component wiring in an explicit `Init()` called by the owner (cross-ref `skill://aku-code-conventions/STRUCTURE.md` §4).
- Logic in `OnEnable` that assumes `Start` already ran — `OnEnable` fires before `Start` on first enable.
- `Awake`/`Start` reading data from a manager that may initialize later → null/zero. Order via explicit init, not lifecycle luck.

## Cleanup pairing (the #1 leak source)

- Every C# `event`/`Action` `+=` MUST have a matching `-=` in `OnDestroy`/`OnDisable`. A subscriber held by a long-lived publisher's delegate is never GC'd.
- **Static events / singletons**: subscribing an instance to `StaticThing.OnX += ...` and not unsubscribing pins the instance for the app lifetime. Always flag.
- Lifecycle pairing (cross-ref `skill://aku-code-conventions`): `Awake`↔`OnDestroy`, `OnEnable`↔`OnDisable`, `Init()`↔`Release()`. A registered/allocated thing on one side with no release on the other = leak.
- `RegisterCallback`/message-bus subscriptions, input-action `+=`, `SceneManager.sceneLoaded +=`, `Application.*` callbacks — all need symmetric removal.

## Native object leaks (not GC-managed)

- Runtime-created `Material`/`Texture2D`/`Mesh`/`RenderTexture`/`Sprite` not `Destroy()`ed → leaks native memory until scene unload (or never). `new Material(shader)` and `renderer.material` both create instances.
- `RenderTexture.GetTemporary` without `ReleaseTemporary`.
- AssetBundles / Addressables loaded but not released (`Release`/`Unload`).

## Coroutine / async after destroy

- Coroutine or `async`/`await` touching `this`/components after the object is destroyed → `MissingReferenceException`. Tie lifetime to a `CancellationToken` (cancel in `OnDestroy`) or stop the coroutine.
- `async void` Unity callbacks swallowing exceptions; fire-and-forget tasks outliving the scene.
- `Invoke`/`InvokeRepeating` not cancelled on disable.

## Scene / singleton hazards

- Static field holding a scene object reference across a scene load → stale ref + leak.
- `DontDestroyOnLoad` singleton with no duplicate-guard → second scene load spawns a duplicate.
- `OnApplicationQuit` vs `OnDestroy` ordering assumptions.

## Suppress

- Subscriptions whose publisher lifetime ≤ subscriber lifetime (e.g., subscribing to a child you own and destroy together) — still prefer symmetry, but not a leak.
- Editor-only allocations.
