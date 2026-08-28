# Lens 1 — Performance & GC

Mobile Unity: per-frame allocations and per-frame lookups are bugs. Flag only real hot-path problems; cite `file:line` + one-line fix. A "hot path" = `Update`/`FixedUpdate`/`LateUpdate`/`OnGUI`, animation/physics callbacks, or any per-frame/per-particle loop.

## Hot-path allocations (GC spikes → frame hitches)

- `new` of a reference type per frame (arrays, `List`, classes, `WaitForSeconds`) — allocate once, cache as a field.
- **Boxing**: value type → `object`; struct in a non-generic collection; `enum` as `Dictionary` key (the default comparer boxes on `GetHashCode` — use an `IEqualityComparer` or an int key). <!-- mcp-lint-ignore -->
- String concat / interpolation / `.ToString()` per frame (UI counters especially) — cache, or update only on change; use `StringBuilder` / `SetText` with pre-baked segments.
- LINQ in hot paths (`Where/Select/Any/OrderBy/First`) — allocates iterators + closures. Replace with a plain `for`.
- Lambda/closure capturing locals in a hot path — allocates a closure object each call.
- `foreach` over a non-array/`List<T>` whose enumerator is a class (some collections) — allocates; prefer indexed `for` on `List`/array.
- `params` array calls per frame; `Debug.Log` with interpolated string (also Lens 5).

## Runtime lookups (CPU + sometimes alloc)

- `GetComponent*` / `GetComponentIn{Children,Parent}` / `Find*` / `FindObjectOfType` / `GameObject.Find` at runtime or in a loop — cache in `Awake`, or Inspector-wire (cross-ref `skill://aku-code-conventions/REFERENCE_WIRING.md`; only post-`Instantiate` exception).
- `Camera.main` per frame — it calls `FindGameObjectsWithTag`. Cache the camera reference.
- `tag == "X"` — allocates the managed string; use `CompareTag("X")`.
- `gameObject`/`transform` repeated property access in a tight loop — cache the local once.

## Coroutines

- `yield return new WaitForSeconds(t)` inside a loop — cache the instruction: `WaitForSeconds _wait = new(t);`.
- `yield return null` busy-wait doing trivial work — consider an event or longer interval.
- Coroutine started but never stopped on disable → keeps running on a pooled/disabled object.

## Physics

- `Physics.Raycast`/`OverlapSphere`/`SphereCast` returning arrays in a hot path → use `RaycastNonAlloc`/`OverlapSphereNonAlloc` with a reused buffer.
- Physics queries/`Rigidbody` writes in `Update` instead of `FixedUpdate`.

## Rendering / UI

- `renderer.material` / `renderer.materials` read — instantiates a material copy (leak + draw-call break). Use `sharedMaterial` for reads or `MaterialPropertyBlock` for per-instance tints.
- Mutating a UGUI element every frame → triggers Canvas rebuild; split static vs dynamic canvases; batch changes.
- `Instantiate`/`Destroy` churn for bullets/FX/enemies → object pool.
- `SetActive` toggling whole subtrees every frame.

## Correctness adjacents (flag as critical)

- Movement/rotation/timers not scaled by `Time.deltaTime` (or `fixedDeltaTime` in `FixedUpdate`) — frame-rate-dependent behavior.
- `== null` on a `UnityEngine.Object` in a tight loop — overloaded equality has cost; acceptable occasionally, not per-element on large loops.

## Suppress (don't flag)

- One-time allocations in `Awake`/`Start`/`Init`.
- Allocations in editor-only code (`#if UNITY_EDITOR`).
- Micro-optimizations with no measurable hot-path impact.
