# Luna Animator and prefab rules

## Animator WriteDefaults

Set WriteDefaults uniformly to `false` across the controller. Mixed WriteDefaults states can make one-shot poses bleed, skip transitions, or restore properties from an unrelated state. The common Animator skill owns the graph mechanics; this file makes the export-target requirement explicit.

When the batched Animator edit cannot reach WriteDefaults, use its editor-side fallback recipe or set the property in the Animator window. Never hand-edit `.controller` or `.anim` serialization.

## Prefab variants

Prefab variants are editor-time asset structure resolved before export. They are valid for a Luna playable, but keep inheritance chains shallow and prefer one base with many variants over deep chains. This limits export/debug complexity and makes overrides auditable.

The common prefab skill owns the base-versus-variant decision and connected-instance creation workflow. This file only adds the Luna export constraint.
