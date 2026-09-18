# Surface — Shaders & GPU (compact)

Shader / compute / `.hlsl` review through a mobile-GPU lens. Compact v1 — covers the high-frequency mobile foot-guns. Deeper shader review (full RDP/bandwidth analysis) is a future expansion.

## Precision (mobile)

- Use half precision only where range and error permit it on the target shader backend. UVs, large coordinates and small differences may need float; fixed is not a portable SRP optimization.
- Inspect generated code/target profiling before claiming a precision change improves cost.

## Variants

- `#pragma multi_compile` for a keyword that is per-material and never toggled at runtime → use `shader_feature` (strips unused variants from the build). `multi_compile` keeps every variant.
- Uncontrolled keyword combinations → variant explosion (build size + load time). Flag large multi_compile sets without justification.

## Fragment cost

- Texture samples inside a loop, or many dependent samples per fragment.
- `pow`/`exp`/`log`/`sin`/`normalize` per fragment where a cheaper approximation or a vertex-stage move works.
- Divergent branches may increase cost; compiler flattening, coherence and GPU architecture determine the result. Do not assume every branch executes both sides.
- Full-screen / large-quad effects in a per-frame pass without need.

## Overdraw / blending

- Alpha-blend (`Blend SrcAlpha OneMinusSrcAlpha`, transparent queue) where alpha-test/`clip()` or opaque would do — transparent overdraw is a top mobile cost.
- Large transparent quads stacked (UI, particles) → overdraw; flag obvious cases.
- `ZWrite Off` + transparent sorting issues.

## Targets & editor-only

- `#pragma target` higher than the project's mobile floor.
- Shader features / debug passes that should be editor/development-only not gated.
- Compute group dimensions must fit dispatch bounds, device limits and target wave/occupancy behavior; there is no universal multiple-of-64 rule. Check bounds on partial groups.
- `ComputeBuffer.GetData` can synchronize CPU/GPU on a hot path; buffers need explicit release (cross-ref Lens 2).

## Suppress

- Desktop/console-targeted shaders where `float`/branching is fine (check the project target).
- Shader Graph auto-generated code (review the graph intent, not the generated HLSL).
