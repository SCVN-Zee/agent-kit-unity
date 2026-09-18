# Lens 1 — Performance & GC

Review recurring allocations and expensive lookups against the actual target and frame budget. Flag only real hot-path problems; cite `file:line` + one-line fix. A "hot path" = `Update`/`FixedUpdate`/`LateUpdate`/`OnGUI`, animation/physics callbacks, or any per-frame/per-particle loop.

## Hot-path allocations (GC spikes → frame hitches)

- `new` of a reference type per frame (arrays, `List`, classes, `WaitForSeconds`) — allocate once, cache as a field.
- **Boxing**: value type → `object` or struct in a non-generic collection. Enum-key dictionary behavior depends on the runtime/comparer; do not replace type-safe keys without allocation evidence. <!-- mcp-lint-ignore -->
- String concat / interpolation / `.ToString()` per frame (UI counters especially) — cache, or update only on change; use `StringBuilder` / `SetText` with pre-baked segments.
- LINQ in hot paths (`Where/Select/Any/OrderBy/First`) — allocates iterators + closures. Replace with a plain `for`.
- Lambda/closure capturing locals in a hot path — allocates a closure object each call.
- `foreach` over a non-array/`List<T>` whose enumerator is a class (some collections) — allocates; prefer indexed `for` on `List`/array.
- `params` array calls per frame; `Debug.Log` with interpolated string (also Lens 5).

## Runtime lookups (CPU + sometimes alloc)

- `GetComponent*` / `GetComponentIn{Children,Parent}` / `Find*` / `FindObjectOfType` / `GameObject.Find` for scene-time dependencies — Inspector-wire (cross-ref `skill://aku-code-conventions/REFERENCE_WIRING.md`; only post-`Instantiate` exception).
- Repeated `Camera.main` in a hot loop — modern Unity caches tagged objects internally but still has access cost. Use an explicit camera reference when appropriate and handle camera changes.
- `tag == "X"` — allocates the managed string; use `CompareTag("X")`.
- `gameObject`/`transform` repeated property access in a tight loop — cache the local once.

## Coroutines

- `yield return new WaitForSeconds(t)` inside a loop — cache the instruction: `WaitForSeconds _wait = new(t);`.
- `yield return null` busy-wait doing trivial work — consider an event or longer interval.
- Coroutines continue when only `MonoBehaviour.enabled` becomes false; GameObject deactivation stops them. Tie work to the intended pool/component lifetime instead of treating all disable operations alike.

## Physics

- Array-returning queries such as `RaycastAll`/`OverlapSphere` in a hot path → consider NonAlloc with a reused buffer and explicit overflow handling. Ordinary Raycast/SphereCast overloads do not return arrays.
- Physics writes need simulation-aligned timing. Query timing depends on the task; render-frame aim queries are not automatically defects.

## Rendering / UI

- `renderer.material` / `renderer.materials` read — instantiates a material copy (leak + draw-call break). Use `sharedMaterial` for reads. Choose per-instance updates with awareness that MaterialPropertyBlock can affect SRP Batcher compatibility; do not mutate shared assets accidentally.
- Mutating a UGUI element every frame → triggers Canvas rebuild; split static vs dynamic canvases; batch changes.
- `Instantiate`/`Destroy` churn for bullets/FX/enemies → object pool.
- `SetActive` toggling whole subtrees every frame.

## Correctness and measured cost

- Integrating a rate without elapsed time can make movement/timers frame-dependent. Do not multiply already-integrated displacement or velocity-setting APIs by deltaTime blindly.
- Unity object null checks include destroyed-object semantics. Optimize only with evidence and preserve those semantics; their mere presence is not a critical defect.

## Suppress (don't flag)

- One-time allocations in `Awake`/`Start`/`Init`.
- Bounded editor setup allocations; do not suppress repeated repaint scans or native texture leaks.
- Micro-optimizations with no measurable hot-path impact.
