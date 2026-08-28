// Fixture: #if/#else duplicate (must dedupe). Also verbatim-string in test code
// inside a regular string literal — this should NOT match as a tool.
namespace Fake.Plugin
{
    public partial class Tool_Reflection
    {
        public const string ReflectionMethodFindToolId = "reflection-method-find";

#if UNITY_EDITOR
        [AiTool(ReflectionMethodFindToolId, Title = "Reflection / Find Method")]
        public void Find() { }
#else
        [AiTool(ReflectionMethodFindToolId, Title = "Reflection / Find Method (stub)")]
        public void FindStub() { }
#endif

        // Skill body codegen sample — verbatim/escaped string MUST NOT be matched as a tool registration.
        const string SkillBodyTemplate =
            "[AiTool(\"sample-get\", Title = \"Sample / Get\")]\n" +
            "[AiTool(@\"sample-rename\", Title = @\"Sample / Rename\")]\n";
    }
}
