# Editor Tooling — Odin-native windows and actions

Build the smallest editor surface that preserves author intent, Undo, persistence, and feedback. Inspector actions and
custom editor tools use Odin's `SdfIconType`; icons support labels and hierarchy rather than replacing them.

Subfile of [`skill://aku-odin`](SKILL.md). Requires Odin — see [`ODIN_ATTRIBUTES.md`](ODIN_ATTRIBUTES.md) §1 for the
presence gate and the `{"odin"}` marker override. Without Odin, none of this applies.

## 1. Why Odin icons and not Unity's

Unity's `EditorGUIUtility.IconContent("d_Refresh")` takes an **undocumented magic string**. A wrong name does not
fail the build — it renders a blank icon, and nothing tells you. `SdfIconType` is a compile-checked enum: a wrong
member is a build error the compiler catches immediately.

**Use `SdfIconType`. Do not use `IconContent` name strings.**

## 2. Where the symbols live — getting this backwards is a build break

| Symbol | Namespace | Usable from |
| --- | --- | --- |
| `SdfIconType`, `IconAlignment` | `Sirenix.OdinInspector` (**runtime**) | anywhere, including `[Button]` on a MonoBehaviour |
| `SdfIcons`, `SirenixEditorGUI` | `Sirenix.OdinInspector.Editor` (**editor-only**) | `Editor/` folder or inside `#if UNITY_EDITOR` |

`[Button(SdfIconType.Play)]` on a runtime component is fine. `SdfIcons.CreateTransparentIconTexture(...)` in that
same file without a guard breaks the player build.

## 3. Inspector buttons

```csharp
[Button(SdfIconType.ArrowClockwise, IconAlignment.LeftOfText)]
private void Rebuild() { }

// Property form, when you also set other options:
[Button(Icon = SdfIconType.Trash, IconAlignment = IconAlignment.LeftOfText)]
private void ClearAll() { }

// Icon-only: pass an empty label. Belongs in a compact repeated group.
[ButtonGroup("Align", ButtonHeight = 25)]
[Button(SdfIconType.TextLeft, "")]
private void AlignLeft() { }
```

`IconAlignment` values: `LeftOfText`, `RightOfText`, `LeftEdge`, `RightEdge`. `Stretch = false` narrows the button.

**`[Button]` replaces `[ContextMenu]`** for anything a human should be able to run from the Inspector — a gear-menu
entry is discoverable only by people who already know it is there.

## 4. Icon-only vs labeled — the judgment call

Icon-only when **all three** hold:

1. the action sits in a repeated compact group (a toolbar row, an alignment cluster),
2. the glyph is conventional — plus, trash, refresh, play, gear,
3. a tooltip carries the name (`[PropertyTooltip]` or the `GUIContent` tooltip).

Otherwise keep the label. **Destructive or infrequent actions always keep their label** — "Delete All Save Data" as
a bare trash glyph is a support ticket. More icons is the goal; unreadable toolbars are not.

## 5. Inspector composition and tabs

Tabs belong to Inspector information architecture, not window chrome. Use [`INSPECTOR_UX.md`](INSPECTOR_UX.md) for the layout ladder, stable-domain test, state semantics, narrow-width rules, and the `LocomotionMotor`-derived example.

Do not add tabs merely because a component has many fields; use them when authors work in stable sibling domains.

## 6. Editor windows

Prefer `OdinEditorWindow` over raw `EditorWindow` — it draws Odin attributes, so the window body is attributes on a
serialized object rather than hand-written `OnGUI`.

Keep lifecycle explicit:

- subscribe and unsubscribe editor events in paired enable/disable paths,
- record Undo before mutating an asset or scene object, then mark persistent assets dirty,
- show success, failure, and empty states in the window rather than relying only on the Console,
- cache asset discovery and expensive derived state; invalidate it from explicit refresh or project-change signals,
- keep long operations cancelable and clear progress UI from a `finally` path.

Window icons need a `Texture2D`, which `SdfIcons` generates from the same enum:

```csharp
// CACHE IT. CreateTransparentIconTexture allocates a new Texture2D on every call —
// calling it from OnGUI leaks a texture per repaint.
private static Texture2D _icon;

private static Texture2D Icon =>
    _icon != null ? _icon
                  : (_icon = SdfIcons.CreateTransparentIconTexture(
                        SdfIconType.Tools, Color.white, 16, 16, 0));

[MenuItem("Tools/Level Builder")]
private static void Open()
{
    LevelBuilderWindow window = GetWindow<LevelBuilderWindow>();
    window.titleContent = new GUIContent("Level Builder", Icon);
}
```

Full template: [`examples/editor-tool-window.md`](examples/editor-tool-window.md).

When one page becomes stable hierarchical navigation, escalate to `OdinMenuEditorWindow`; only then consider
selectors, explicit property trees, or custom drawers. See
[`ADVANCED_EDITOR_TOOLING.md`](ADVANCED_EDITOR_TOOLING.md) and
[`examples/menu-editor-window.md`](examples/menu-editor-window.md).

## 7. What has no icon — do not invent one

**`[MenuItem]` takes no icon parameter.** A menu entry is text and a shortcut; there is no overload that accepts a
`SdfIconType` or a texture. Icons reach the user through the window's `titleContent`, an `EditorTool`'s
`toolbarIcon`, or the buttons inside the window — not through the menu path.

Same discipline as the built-in keep-list in `ODIN_ATTRIBUTES.md` §4: state the non-capability instead of
letting a plausible-looking parameter get invented.

## 8. Icon shortlist by intent

Convenience starting points, not a closed list — `SdfIconType` exposes the full Bootstrap icon set, and the
compiler validates whatever you pick.

| Intent | `SdfIconType` |
| --- | --- |
| add / create | `PlusLg`, `PlusCircleFill` |
| remove / delete | `Trash`, `DashLg` |
| refresh / rebuild | `ArrowClockwise`, `ArrowRepeat` |
| play / run | `PlayFill` |
| stop | `StopFill` |
| save | `Save`, `FloppyFill` |
| settings | `GearFill`, `Sliders` |
| search / find | `Search` |
| folder / asset | `FolderFill`, `FileEarmarkFill` |
| link / reference | `Link45deg` |
| warning | `ExclamationTriangleFill` |
| tools | `Tools`, `Wrench` |

## 9. Build target boundaries

Editor-only tooling stays under `Editor/` or `#if UNITY_EDITOR`; runtime-field attributes follow the target's installed build rules.

## Cross-references

- [`ODIN_ATTRIBUTES.md`](ODIN_ATTRIBUTES.md) — the mandate, presence gate, mapping tables, built-in keep-list
- [`INSPECTOR_UX.md`](INSPECTOR_UX.md) — information hierarchy, state semantics, groups, tabs, collections
- [`ADVANCED_EDITOR_TOOLING.md`](ADVANCED_EDITOR_TOOLING.md) — menu trees, selectors, property trees, drawers, validation
- `skill://aku-code-conventions/REFERENCE_WIRING.md` — `Setup Refs` auto-wiring, which uses `[Button]` per §3
- [`examples/editor-tool-window.md`](examples/editor-tool-window.md) — canonical `OdinEditorWindow`
- [`examples/menu-editor-window.md`](examples/menu-editor-window.md) — cached `OdinMenuEditorWindow` navigation
- Installed project-specific rules — target-specific editor-strip policy.
