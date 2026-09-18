# Example — focused Odin editor window

Place this in an Editor-only assembly. The example uses a selected ScriptableObject, with a bounded inline editor;
project-specific batch writes belong in a separate labeled, validated action. Verify lifecycle signatures against the
installed Odin version. This is an illustrative recipe, not a compiled consumer fixture.

```csharp
using Sirenix.OdinInspector;
using Sirenix.OdinInspector.Editor;
using UnityEditor;
using UnityEngine;

namespace GameName.Editor
{
    public sealed class ConfigInspectorWindow : OdinEditorWindow
    {
        //----------------------------------------------------------------------
        // Serialized Fields
        //----------------------------------------------------------------------
        [Required]
        [SerializeField, AssetsOnly, InlineEditor]
        private ScriptableObject _config;

        //----------------------------------------------------------------------
        // Private Fields
        //----------------------------------------------------------------------
        private Texture2D _tabIcon;

        //----------------------------------------------------------------------
        // Lifecycle
        //----------------------------------------------------------------------
        [MenuItem("Tools/Config Inspector")]
        private static void Open()
        {
            GetWindow<ConfigInspectorWindow>().Show();
        }

        protected override void OnEnable()
        {
            base.OnEnable();
            if (_tabIcon == null)
            {
                _tabIcon = SdfIcons.CreateTransparentIconTexture(SdfIconType.Tools, Color.white, 16, 16, 0);
                _tabIcon.hideFlags = HideFlags.HideAndDontSave;
            }
            titleContent = new GUIContent("Config Inspector", _tabIcon);
        }

        protected override void OnDisable()
        {
            try
            {
                base.OnDisable();
            }
            finally
            {
                titleContent = new GUIContent("Config Inspector");
                if (_tabIcon != null)
                {
                    DestroyImmediate(_tabIcon);
                    _tabIcon = null;
                }
            }
        }

        //----------------------------------------------------------------------
        // Logic
        //----------------------------------------------------------------------
        [Button(SdfIconType.Link45deg, "Use Selected Config")]
        private void UseSelectedConfig()
        {
            ScriptableObject selected = Selection.activeObject as ScriptableObject;
            if (selected != null && AssetDatabase.Contains(selected))
            {
                _config = selected;
            }
        }
    }
}
```

The generated icon is window-owned: created once per enabled lifetime and destroyed on disable/reload. Never destroy
shared asset icons. The object field remains visible because inline edits affect the shared selected asset.

Selecting a target changes only window state. Odin's inline editor handles ordinary field editing; custom direct-write
buttons must implement their own Undo, dirty and prefab-override contract. Do not save all assets on window close.

Test light/dark readability, target deletion, domain reload, inline Undo/redo and asset persistence. Custom GUI should
use DrawEditors/OnInspectorGUI rather than bypassing base drawing. See [`EDITOR_TOOLING.md`](../EDITOR_TOOLING.md).
