# Example — Odin menu-tree editor window

Use a menu tree when one editor workspace owns stable sibling or hierarchical pages. `OdinMenuEditorWindow` draws the
object attached to the selected menu item; no hand-written detail Inspector is needed.

This example indexes assets only on construction or explicit refresh. It never scans from a displayed getter or
repaint callback.

```csharp
using System.Collections.Generic;
using Sirenix.OdinInspector;
using Sirenix.OdinInspector.Editor;
using UnityEditor;
using UnityEngine;

namespace <GameName>.Editor
{
    public sealed class ProjectToolsWindow : OdinMenuEditorWindow
    {
        //----------------------------------------------------------------------
        // Private Fields
        //----------------------------------------------------------------------
        private static Texture2D _tabIcon;
        private AssetsPage _assetsPage;
        private DiagnosticsPage _diagnosticsPage;

        //----------------------------------------------------------------------
        // Properties
        //----------------------------------------------------------------------
        private static Texture2D TabIcon =>
            _tabIcon != null
                ? _tabIcon
                : (_tabIcon = SdfIcons.CreateTransparentIconTexture(
                    SdfIconType.Tools, Color.white, 16, 16, 0));

        private AssetsPage Assets => _assetsPage ??= new AssetsPage();
        private DiagnosticsPage Diagnostics => _diagnosticsPage ??= new DiagnosticsPage();

        //----------------------------------------------------------------------
        // Lifecycle
        //----------------------------------------------------------------------
        [MenuItem("Tools/Project Tools")]
        private static void Open()
        {
            ProjectToolsWindow window = GetWindow<ProjectToolsWindow>();
            window.titleContent = new GUIContent("Project Tools", TabIcon);
            window.Show();
        }

        //----------------------------------------------------------------------
        // Drawing
        //----------------------------------------------------------------------
        protected override OdinMenuTree BuildMenuTree()
        {
            OdinMenuTree tree = new OdinMenuTree();
            tree.Config.AutoScrollOnSelectionChanged = true;
            tree.Config.DrawScrollView = true;
            tree.Config.AutoHandleKeyboardNavigation = true;
            tree.Config.DrawSearchToolbar = true;

            tree.Add("Configuration/Assets", Assets);
            tree.Add("Diagnostics/Overview", Diagnostics);
            return tree;
        }

        private sealed class AssetsPage
        {
            [ShowInInspector, ReadOnly]
            [ListDrawerSettings(ShowFoldout = false)]
            [LabelText("Configuration Assets")]
            private readonly List<string> _paths = new List<string>();

            public AssetsPage()
            {
                Refresh();
            }

            [Button(SdfIconType.ArrowClockwise, "Refresh Asset Index")]
            private void Refresh()
            {
                _paths.Clear();
                string[] guids = AssetDatabase.FindAssets("t:ScriptableObject", new[] { "Assets/Config" });
                foreach (string guid in guids)
                {
                    _paths.Add(AssetDatabase.GUIDToAssetPath(guid));
                }
            }

            // Labeled despite the familiar glyph: clearing a result set is infrequent and easy to misread.
            [Button(SdfIconType.Trash, "Clear Indexed Results")]
            private void ClearResults()
            {
                _paths.Clear();
            }
        }

        private sealed class DiagnosticsPage
        {
            [ShowInInspector, ReadOnly]
            [DisplayAsString]
            [LabelText("Editor State")]
            private string EditorState => EditorApplication.isPlaying ? "Play Mode" : "Edit Mode";

            [ShowInInspector, ReadOnly]
            [DisplayAsString]
            [LabelText("Active Platform")]
            private string Platform => EditorUserBuildSettings.activeBuildTarget.ToString();
        }
    }
}
```

## Why this shape

- `Configuration/Assets` and `Diagnostics/Overview` are stable semantic paths, not class names.
- Page objects survive menu-tree rebuilds; their state is not recreated per repaint.
- Search and keyboard navigation are enabled because the tree may grow and the pages do not consume those keys.
- Asset discovery runs only in the page constructor and explicit refresh action.
- The title icon texture is cached; `[MenuItem]` remains text-only.

This sample mutates only in-memory result state, so it correctly creates no Undo record and marks no asset dirty. A
page that changes an asset or scene object must call `Undo.RecordObject` before mutation and mark persistent assets
dirty afterward; follow [`EDITOR_TOOLING.md`](../EDITOR_TOOLING.md).
