const test = require("node:test");
const assert = require("node:assert/strict");
const { EventEmitter } = require("events");
const { PassThrough } = require("stream");
const { rpcClient } = require("../lib/codex-discovery-rpc");
const { verifyRows } = require("../check-codex-discovery.cjs");
function client() {
  const child = new EventEmitter();
  child.stdin = new PassThrough();
  child.stdout = new PassThrough();
  return { child, rpc: rpcClient(child, 100) };
}
test("probe rejects duplicate cwd responses even with the expected row count", () => {
  const expected = new Map([
    ["/one", ["aku-x"]],
    ["/two", ["aku-x"]],
  ]);
  const row = {
    cwd: "/one",
    errors: [],
    skills: [{ name: "aku-x", scope: "repo", enabled: true }],
  };
  assert.throws(() => verifyRows({ data: [row, row] }, expected));
  verifyRows({ data: [row, { ...row, cwd: "/two" }] }, expected);
});
for (const scenario of ["pipe", "early-exit", "missing-executable"]) {
  test(`probe retains terminal error and settles pending/future requests: ${scenario}`, async () => {
    const { child, rpc } = client();
    const first = rpc.request("initialize", {});
    if (scenario === "pipe") child.stdin.emit("error", new Error("EPIPE"));
    if (scenario === "early-exit") child.emit("exit", 0);
    if (scenario === "missing-executable")
      child.emit("error", new Error("spawn codex ENOENT"));
    await assert.rejects(first, /EPIPE|exited|ENOENT/);
    await assert.rejects(rpc.request("skills/list", {}), /EPIPE|exited|ENOENT/);
    assert.throws(() => rpc.notify("initialized"), /EPIPE|exited|ENOENT/);
  });
}
test("probe preserves Unicode cwd values split across pipe chunks", async () => {
  const { child, rpc } = client();
  const pending = rpc.request("skills/list", {});
  const result = { data: [{ cwd: "/Unity-é-遊戲" }] };
  const bytes = Buffer.from(JSON.stringify({ id: 1, result }) + "\n");
  const boundary = bytes.indexOf(Buffer.from("é")) + 1;
  child.stdout.write(bytes.subarray(0, boundary));
  child.stdout.write(bytes.subarray(boundary));
  assert.deepEqual(await pending, result);
});
test("probe resolves valid RPC responses without a model request", async () => {
  const { child, rpc } = client();
  const p = rpc.request("skills/list", { cwds: [] });
  child.stdout.write('{"id":1,"result":{"data":[]}}\n');
  assert.deepEqual(await p, { data: [] });
});
