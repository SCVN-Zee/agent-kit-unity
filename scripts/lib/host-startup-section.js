/** Only the delimited bytes belong to Codex; never own the whole AGENTS file. */
const BEGIN = "<!-- aku:codex:begin -->";
const END = "<!-- aku:codex:end -->";
const BOM = Buffer.from([239, 187, 191]);
function section(body) {
  return Buffer.concat([
    Buffer.from(BEGIN + "\n"),
    body,
    Buffer.from("\n" + END + "\n"),
  ]);
}
function parseSection(bytes) {
  if (!bytes) return null;
  const starts = [],
    ends = [];
  for (const [token, found] of [
    [BEGIN, starts],
    [END, ends],
  ]) {
    let pos = -1;
    while ((pos = bytes.indexOf(token, pos + 1)) !== -1) found.push(pos);
  }
  if (!starts.length && !ends.length) return null;
  if (starts.length !== 1 || ends.length !== 1 || starts[0] >= ends[0])
    throw new Error("ambiguous Codex startup markers; resolve manually");
  const start = starts[0],
    last = ends[0];
  const hasBom = bytes.subarray(0, 3).equals(BOM);
  const end = last + Buffer.byteLength(END) + 1;
  if (
    (start !== 0 && !(start === 3 && hasBom) && bytes[start - 1] !== 10) ||
    bytes[start + BEGIN.length] !== 10 ||
    bytes[last - 1] !== 10 ||
    bytes[end - 1] !== 10
  )
    throw new Error("malformed Codex startup markers; resolve manually");
  return { start, end, content: bytes.subarray(start, end) };
}
function replaceSection(original, desired) {
  const bytes = original || Buffer.alloc(0);
  const found = parseSection(bytes);
  const pos = found ? found.start : bytes.subarray(0, 3).equals(BOM) ? 3 : 0;
  return Buffer.concat([
    bytes.subarray(0, pos),
    desired || Buffer.alloc(0),
    bytes.subarray(found ? found.end : pos),
  ]);
}
module.exports = { section, parseSection, replaceSection };
