const test = require("node:test");
const assert = require("node:assert/strict");
const {
  section,
  parseSection,
  replaceSection,
} = require("../lib/host-startup-section");
const { hashBytes } = require("../lib/omp-install-lock");
for (const original of ["", "user", "user\r\n", "\ufeffUser\r\n\u00e9"]) {
  test(`managed span round trip preserves bytes: ${JSON.stringify(original)}`, () => {
    const bytes = Buffer.from(original);
    const inserted = replaceSection(bytes, section(Buffer.from("guide\n")));
    const found = parseSection(inserted);
    assert.equal(
      hashBytes(found.content),
      hashBytes(section(Buffer.from("guide\n"))),
    );
    const edited = Buffer.concat([inserted, Buffer.from("extra user bytes")]);
    assert.deepEqual(
      replaceSection(edited, null),
      Buffer.concat([bytes, Buffer.from("extra user bytes")]),
    );
    const updated = replaceSection(inserted, section(Buffer.from("new\n")));
    assert.deepEqual(replaceSection(updated, null), bytes);
  });
}
test("reject malformed or duplicate sections rather than guessing ownership", () => {
  for (const bad of [
    "<!-- aku:codex:begin -->\nuser",
    "<!-- aku:codex:end -->\n",
    "<!-- aku:codex:end -->\n<!-- aku:codex:begin -->\n",
    "<!-- aku:codex:begin --> extra\n<!-- aku:codex:end -->\n",
    section(Buffer.from("guide")).toString().repeat(2),
  ])
    assert.throws(() => parseSection(Buffer.from(bad)), /ambiguous|malformed/);
});
