const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");
const { computePayload } = require("../lib/omp-install-payload");
const { projectPiPayload } = require("../lib/pi-install-payload");
const KIT = path.resolve(__dirname, "../../kit");
const read = (rel) => fs.readFileSync(path.join(KIT, rel), "utf8");
const odin = (name) => read(`skills/aku-odin/${name}`);
const recipes = [
  "GROUPING_AND_ACTIONS.md",
  "PICKERS_AND_VALIDATION.md",
  "COLLECTIONS_AND_REFERENCES.md",
  "VERSION_AND_MODULES.md",
  "examples/grouped-component.md",
  "examples/collection-config.md",
];

// Text contracts prevent known regressions; they are not Unity compilation/UX tests.
test("Odin recipes are discoverable, linked and projected for both hosts", () => {
  const source = computePayload(KIT);
  const pi = projectPiPayload(source);
  for (const name of recipes) {
    const rel = `skills/aku-odin/${name}`;
    assert.ok(source[rel], rel);
    assert.ok(pi[rel], rel);
    assert.ok(odin("SKILL.md").includes(`](${name})`), name);
  }
  for (const [rel, entry] of Object.entries(source)) {
    if (!rel.startsWith("skills/aku-odin/") || !rel.endsWith(".md")) continue;
    const text = fs.readFileSync(entry.srcAbs, "utf8");
    for (const match of text.matchAll(/\]\(([^\s)]+\.md)(?:#[^)]*)?\)/g)) {
      if (/^[a-z]+:/i.test(match[1])) continue;
      const dest = path.posix.normalize(
        path.posix.join(path.posix.dirname(rel), match[1]),
      );
      assert.ok(source[dest], `${rel} -> ${dest}`);
      assert.ok(pi[dest], `${rel} -> Pi ${dest}`);
    }
    assert.ok(text.split("\n").length - 1 <= 200, rel);
  }
  assert.equal(
    source["skills/aku-odin/examples/tabbed-component.md"],
    undefined,
  );
});

test("reference guidance distinguishes managed values, overrides and saves", () => {
  const text = read("skills/aku-code-conventions/REFERENCE_WIRING.md");
  assert.match(text, /must not derive from `UnityEngine\.Object`/);
  assert.match(text, /as IPlayerInput.*can return null/);
  assert.match(text, /RecordPrefabInstancePropertyModifications/);
  assert.match(text, /Dirty marking is not saving/);
  const review = read("skills/aku-code-review/SKILL.md");
  assert.doesNotMatch(
    review,
    /save the scene first|tests are read-only intent/,
  );
  assert.match(review, /not run\/blocked/);
  assert.match(review, /not proof.*compiled/);
});

test("collection and optional-module guidance does not imply serialization", () => {
  const required = read("skills/aku-code-conventions/REQUIRED_FIELDS.md");
  assert.doesNotMatch(required, /no-op.*cannot fire|empty, never null/);
  assert.match(required, /RequiredListLength/);
  assert.match(required, /count, element validity and uniqueness separately/);
  const collections = odin("COLLECTIONS_AND_REFERENCES.md");
  assert.match(collections, /Rendering is not serialization/);
  assert.match(collections, /TableMatrix renders 2D arrays/);
  assert.match(odin("VERSION_AND_MODULES.md"), /not run/);
  assert.match(odin("VERSION_AND_MODULES.md"), /Separate installed product/);
});

test("editor examples own icons and avoid a guessed config root", () => {
  assert.match(
    odin("EDITOR_TOOLING.md"),
    /`SirenixEditorGUI` \| `Sirenix.Utilities.Editor`/,
  );
  for (const name of ["editor-tool-window.md", "menu-editor-window.md"]) {
    const text = odin(`examples/${name}`);
    assert.match(text, /OnDisable\(\)/);
    assert.match(text, /DestroyImmediate\(_tabIcon\)/);
    assert.doesNotMatch(text, /static Texture2D/);
  }
  const browser = odin("examples/menu-editor-window.md");
  assert.doesNotMatch(browser, /"Assets\/Configs?"/);
  assert.match(browser, /IsValidFolder/);
  assert.match(browser, /TrySelectMenuItemWithObject/);
});
