// Fixture: category-merge test (editor-application + editor-selection both → "editor").
namespace Fake.Plugin
{
    public partial class Tool_Editor
    {
        public const string EditorAppGetStateToolId = "editor-application-get-state";
        public const string EditorSelectionGetToolId = "editor-selection-get";

        [AiTool(EditorAppGetStateToolId, Title = "Editor / App / Get State")]
        public void GetState() { }

        [AiTool(EditorSelectionGetToolId, Title = "Editor / Selection / Get")]
        public void GetSelection() { }
    }
}
