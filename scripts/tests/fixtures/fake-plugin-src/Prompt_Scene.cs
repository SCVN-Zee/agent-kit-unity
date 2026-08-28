// Fixture: prompts. One Enabled=true, one Enabled=false, one omits Enabled (defaults to true).
namespace Fake.Plugin.Prompt
{
    public partial class Prompt_Scene
    {
        [AiPrompt(Name = "scene-setup", Role = Role.User, Enabled = true)]
        public void Setup() { }

        [AiPrompt(Name = "scene-cleanup", Role = Role.User, Enabled = false)]
        public void Cleanup() { }

        [AiPrompt(Name = "scene-default-true", Role = Role.User)]
        public void DefaultEnabled() { }
    }
}
