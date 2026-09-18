# Example — searchable asset workspace

Place in an Editor-only assembly. Choose a project-owned folder in the Project view and open this window. It loads
ScriptableObject assets only on explicit refresh, never from a displayed getter. Loading assets can run project
callbacks: this authoring tool is not a report-only review capability. Verify against installed Unity/Odin versions.

```csharp
using System;
using System.Collections.Generic;
using Sirenix.OdinInspector;
using Sirenix.OdinInspector.Editor;
using UnityEditor;
using UnityEngine;

namespace GameName.Editor
{
    public sealed class ConfigBrowserWindow : OdinMenuEditorWindow
    {
        //----------------------------------------------------------------------
        // Private Fields
        //----------------------------------------------------------------------
        private readonly List<ScriptableObject> _assets = new List<ScriptableObject>();
        private BrowserPage _page;
        private Texture2D _tabIcon;

        //----------------------------------------------------------------------
        // Lifecycle
        //----------------------------------------------------------------------
        [MenuItem("Tools/Config Browser")]
        private static void Open()
        {
            GetWindow<ConfigBrowserWindow>().Show();
        }

        protected override void OnEnable()
        {
            _page = new BrowserPage(this);
            base.OnEnable();
            ForceMenuTreeRebuild();
            if (_tabIcon == null)
            {
                _tabIcon = SdfIcons.CreateTransparentIconTexture(SdfIconType.Tools, Color.white, 16, 16, 0);
                _tabIcon.hideFlags = HideFlags.HideAndDontSave;
            }
            titleContent = new GUIContent("Config Browser", _tabIcon);
        }

        protected override void OnDisable()
        {
            try
            {
                base.OnDisable();
            }
            finally
            {
                titleContent = new GUIContent("Config Browser");
                if (_tabIcon != null)
                {
                    DestroyImmediate(_tabIcon);
                    _tabIcon = null;
                }
                _assets.Clear();
            }
        }

        //----------------------------------------------------------------------
        // Logic
        //----------------------------------------------------------------------
        protected override OdinMenuTree BuildMenuTree()
        {
            if (_page == null)
            {
                _page = new BrowserPage(this);
            }
            OdinMenuTree tree = new OdinMenuTree();
            tree.Config.DrawSearchToolbar = true;
            tree.Config.AutoHandleKeyboardNavigation = true;
            tree.Selection.SupportsMultiSelect = false;
            tree.Add("Browser", _page);
            foreach (ScriptableObject asset in _assets)
            {
                if (asset != null)
                {
                    tree.Add(AssetDatabase.GetAssetPath(asset), asset);
                }
            }
            return tree;
        }

        private void RefreshAssets()
        {
            UnityEngine.Object selected = MenuTree.Selection.SelectedValue as UnityEngine.Object;
            string root = _page.Root;
            _assets.Clear();
            if ((root == "Assets" || root.StartsWith("Assets/", StringComparison.Ordinal)) &&
                AssetDatabase.IsValidFolder(root))
            {
                string[] guids = AssetDatabase.FindAssets("t:ScriptableObject", new[] { root });
                List<string> paths = new List<string>();
                foreach (string guid in guids)
                {
                    paths.Add(AssetDatabase.GUIDToAssetPath(guid));
                }
                paths.Sort(StringComparer.Ordinal);
                foreach (string path in paths)
                {
                    ScriptableObject asset = AssetDatabase.LoadAssetAtPath<ScriptableObject>(path);
                    if (asset != null)
                    {
                        _assets.Add(asset);
                    }
                }
                _page.Status = _assets.Count + " assets. Select one to edit its shared data.";
            }
            else
            {
                _page.Status = "Select a valid Assets subfolder, then refresh.";
            }
            ForceMenuTreeRebuild();
            TrySelectMenuItemWithObject(selected != null && _assets.Contains(selected as ScriptableObject)
                ? (object)selected : _page);
        }

        private sealed class BrowserPage
        {
            private readonly ConfigBrowserWindow _owner;
            [ShowInInspector, ReadOnly] public string Root { get; private set; } = "";
            [ShowInInspector, ReadOnly] public string Status { get; set; } = "Choose a content folder to begin.";

            public BrowserPage(ConfigBrowserWindow owner)
            {
                _owner = owner;
            }

            [Button(SdfIconType.Link45deg, "Use Selected Folder")]
            private void UseSelectedFolder()
            {
                string path = AssetDatabase.GetAssetPath(Selection.activeObject);
                if (AssetDatabase.IsValidFolder(path))
                {
                    Root = path;
                }
            }

            [Button(SdfIconType.ArrowClockwise, "Refresh Asset Index")]
            private void Refresh()
            {
                _owner.RefreshAssets();
            }
        }
    }
}
```

## Contracts and limits

The menu draws actual assets rather than path strings. Paths remain unique for same-named assets in different folders;
selection is restored by object identity on explicit refresh, or falls back to the Browser page if the asset vanished.
The example indexes main assets only, not every subasset. Narrow the selected root for large projects.

The transient index/root reset on reload; no persistence is promised. If the production workflow needs restoration,
store a validated root and selected GUID deliberately, then rebuild outside repaint. There is no hardcoded Config/Configs
root and no automatic scan when merely opening the window. Refresh after renames/deletions; no broad project events
are subscribed by this minimal example.

Odin edits the selected shared asset; custom batch actions need explicit Undo/apply/save ownership. Test reload,
selection, deletion, keyboard search and asset Undo/persistence using [`VERSION_AND_MODULES.md`](../VERSION_AND_MODULES.md).
