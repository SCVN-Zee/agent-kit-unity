// Fixture: test/sample file path — every [AiTool] here must be excluded by the generator.
namespace Fake.Plugin.TestFiles
{
    public partial class SolarSystemTestScript
    {
        public const string SampleGetToolId = "sample-get";

        [AiTool(SampleGetToolId, Title = "Sample / Get")]
        public void Get() { }
    }
}
