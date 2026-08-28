// Fixture: extension package — tool from an external source.
namespace Fake.Extension.Animation
{
    public partial class Tool_Animation
    {
        public const string AnimationCreateToolId = "animation-create";

        [AiTool(AnimationCreateToolId, Title = "Animation / Create")]
        public void Create() { }
    }
}
