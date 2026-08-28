# Surface — Shaders & GPU (compact)

Shader / compute / `.hlsl` review through a mobile-GPU lens. Compact v1 — covers the high-frequency mobile foot-guns. Deeper shader review (full RDP/bandwidth analysis) is a future expansion.

## Precision (mobile)

- `float` in the fragment stage where `half` suffices (colors, UVs, most lighting) — `half`/`fixed` are materially cheaper on mobile GPUs. Flag gratuitous `float`.
- Missing precision qualifiers in hand-written HLSL on a mobile target.

## Variants

- `#pragma multi_compile` for a keyword that is per-material and never toggled at runtime → use `shader_feature` (strips unused variants from the build). `multi_compile` keeps every variant.
- Uncontrolled keyword combinations → variant explosion (build size + load time). Flag large multi_compile sets without justification.

## Fragment cost

- Texture samples inside a loop, or many dependent samples per fragment.
- `pow`/`exp`/`log`/`sin`/`normalize` per fragment where a cheaper approximation or a vertex-stage move works.
- Dynamic branching (`if` on a non-uniform) in the fragment stage on mobile — often evaluates both sides.
- Full-screen / large-quad effects in a per-frame pass without need.

## Overdraw / blending

- Alpha-blend (`Blend SrcAlpha OneMinusSrcAlpha`, transparent queue) where alpha-test/`clip()` or opaque would do — transparent overdraw is a top mobile cost.
- Large transparent quads stacked (UI, particles) → overdraw; flag obvious cases.
- `ZWrite Off` + transparent sorting issues.

## Targets & editor-only

- `#pragma target` higher than the project's mobile floor.
- Shader features / debug passes that should be editor/development-only not gated.
- Compute shader: thread-group size not a multiple of 64 (wavefront waste); `ComputeBuffer.GetData` causing a CPU↔GPU sync stall on a hot path; buffers not `Release()`d (cross-ref Lens 2 native leaks).

## Suppress

- Desktop/console-targeted shaders where `float`/branching is fine (check the project target).
- Shader Graph auto-generated code (review the graph intent, not the generated HLSL).
