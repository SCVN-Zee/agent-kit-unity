// Fixture: realistic multi-line [AiTool] with constant reference.
namespace Fake.Plugin
{
    public partial class Tool_Scene
    {
        public const string SceneOpenToolId = "scene-open";
        public const string SceneSaveToolId = "scene-save";

        [AiTool
        (
            SceneOpenToolId,
            Title = "Scene / Open"
        )]
        public void Open() { }

        [AiTool(SceneSaveToolId, Title = "Scene / Save")]
        public void Save() { }
    }
}
