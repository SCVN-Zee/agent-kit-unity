# Example — Odin editor tool window (icon-first)

Canonical custom editor tool: `OdinEditorWindow` so the body is attributes rather than hand-written `OnGUI`, an
icon in the tab via a cached `SdfIcons` texture, and an icon-only button row. See
[`EDITOR_TOOLING.md`](../EDITOR_TOOLING.md).

Lives under `Assets/Editor/` (or any `Editor` asmdef) — `SdfIcons`, `SirenixEditorGUI` and `UnityEditor.*` are
editor-only assemblies.

```csharp
using Sirenix.OdinInspector;
using Sirenix.OdinInspector.Editor;
using UnityEditor;
using UnityEngine;

namespace <GameName>.Editor
{
    /// <summary>Batch-applies spawn settings to selected level assets.</summary>
    public class LevelBuilderWindow : OdinEditorWindow
    {
        //----------------------------------------------------------------------
        // Serialized Fields
        //----------------------------------------------------------------------
        [Title("Target")]
        [Required]
        [SerializeField, AssetsOnly] private LevelConfig _config;

        [Title("Spawn")]
        [SerializeField, PropertyRange(1, 50)] private int _waveCount = 5;
        [SerializeField, LabelText("Interval (s)")] private float _interval = 2f;

        //----------------------------------------------------------------------
        // Private Fields
        //----------------------------------------------------------------------
        // CreateTransparentIconTexture allocates a new Texture2D per call — cached
        // so a repaint does not leak one texture per frame.
        private static Texture2D _tabIcon;

        //----------------------------------------------------------------------
        // Properties
        //----------------------------------------------------------------------
        private static Texture2D TabIcon =>
            _tabIcon != null
                ? _tabIcon
                : (_tabIcon = SdfIcons.CreateTransparentIconTexture(
                       SdfIconType.Tools, Color.white, 16, 16, 0));

        //----------------------------------------------------------------------
        // Lifecycle
        //----------------------------------------------------------------------
        [MenuItem("Tools/Level Builder")]   // no icon parameter exists on MenuItem
        private static void Open()
        {
            LevelBuilderWindow window = GetWindow<LevelBuilderWindow>();
            window.titleContent = new GUIContent("Level Builder", TabIcon);
            window.Show();
        }

        //----------------------------------------------------------------------
        // Logic
        //----------------------------------------------------------------------
        // Labeled: infrequent and it writes assets. Not a bare glyph.
        [Button(SdfIconType.HammerFill, "Build Waves", ButtonHeight = 30)]
        private void BuildWaves()
        {
            if (_config == null)
            {
                return;
            }

            Undo.RecordObject(_config, "Build Waves");
            // ... populate _config ...
            EditorUtility.SetDirty(_config);
        }

        // Icon-only: compact repeated group, conventional glyphs, tooltips supply names.
        [ButtonGroup("Nav", ButtonHeight = 22)]
        [Button(SdfIconType.ChevronLeft, ""), PropertyTooltip("Previous level")]
        private void Previous() { }

        [ButtonGroup("Nav")]
        [Button(SdfIconType.ChevronRight, ""), PropertyTooltip("Next level")]
        private void Next() { }

        [ButtonGroup("Nav")]
        [Button(SdfIconType.ArrowClockwise, ""), PropertyTooltip("Reload from disk")]
        private void Reload() { }
    }
}
```

## Checklist

- ✅ `OdinEditorWindow`, not raw `EditorWindow` — attributes draw the body
- ✅ Under `Assets/Editor/` — `SdfIcons` / `UnityEditor.*` are editor-only assemblies
- ✅ Tab icon from `SdfIcons.CreateTransparentIconTexture`, **cached in a static** (never called per repaint)
- ✅ `[MenuItem]` carries no icon — icons reach the user via `titleContent` and the buttons
- ✅ Destructive/infrequent action keeps its label; the compact nav row is icon-only **with tooltips**
- ✅ `Undo.RecordObject` + `EditorUtility.SetDirty` around asset mutation
- ✅ Section dividers and access modifiers per `skill://aku-code-conventions/STRUCTURE.md`
