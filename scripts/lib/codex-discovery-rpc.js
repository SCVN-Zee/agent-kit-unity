/** Minimal no-model app-server client for the optional native discovery probe. */
function rpcClient(child, timeoutMs = 15000) {
  const pending = new Map();
  let serial = 0,
    buffer = "",
    terminalError = null;
  function fail(error) {
    terminalError ||= error;
    for (const p of pending.values()) p.reject(terminalError);
    pending.clear();
  }
  child.on("error", fail);
  child.on("exit", (code) => fail(new Error(`app-server exited ${code}`)));
  child.stdin.on("error", fail);
  child.stdout.on("error", fail);
  child.stdout.setEncoding("utf8"); // Retain multibyte codepoints across pipe chunks.
  child.stdout.on("data", (data) => {
    buffer += data;
    let end;
    while ((end = buffer.indexOf("\n")) >= 0) {
      const line = buffer.slice(0, end);
      buffer = buffer.slice(end + 1);
      try {
        const msg = JSON.parse(line),
          p = pending.get(msg.id);
        if (p) {
          pending.delete(msg.id);
          if (msg.error) p.reject(new Error(JSON.stringify(msg.error)));
          else p.resolve(msg.result);
        }
      } catch (error) {
        fail(error);
      }
    }
  });
  function send(message) {
    if (terminalError) throw terminalError;
    try {
      child.stdin.write(JSON.stringify(message) + "\n");
    } catch (error) {
      fail(error);
      throw error;
    }
  }
  function request(method, params) {
    if (terminalError) return Promise.reject(terminalError);
    return new Promise((resolve, reject) => {
      const id = ++serial;
      const timeout = setTimeout(() => {
        pending.delete(id);
        reject(new Error(`${method} timed out`));
      }, timeoutMs);
      pending.set(id, {
        resolve: (x) => {
          clearTimeout(timeout);
          resolve(x);
        },
        reject: (e) => {
          clearTimeout(timeout);
          reject(e);
        },
      });
      send({ id, method, params });
    });
  }
  return { request, notify: (method) => send({ method }) };
}
module.exports = { rpcClient };
