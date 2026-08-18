const targetUrl = "http://localhost:3000/postos?q=%C3%81guas%20Lindas%20de%20Goi%C3%A1s%2C%20GO";
const cdp = await fetch("http://127.0.0.1:9222/json/list").then(response => response.json());
const page = cdp.find(target => target.type === "page");

if (!page?.webSocketDebuggerUrl) throw new Error("Página do Chromium não encontrada.");

const socket = new WebSocket(page.webSocketDebuggerUrl);
await new Promise((resolve, reject) => {
  socket.addEventListener("open", resolve, { once: true });
  socket.addEventListener("error", reject, { once: true });
});

let sequence = 0;
const pending = new Map();
socket.addEventListener("message", event => {
  const message = JSON.parse(event.data);
  const handler = pending.get(message.id);
  if (!handler) return;
  pending.delete(message.id);
  message.error ? handler.reject(new Error(message.error.message)) : handler.resolve(message.result);
});

const command = (method, params = {}) => new Promise((resolve, reject) => {
  const id = ++sequence;
  pending.set(id, { resolve, reject });
  socket.send(JSON.stringify({ id, method, params }));
});
const evaluate = async expression => (await command("Runtime.evaluate", { expression, returnByValue: true, awaitPromise: true })).result.value;
const waitFor = async (predicate, label) => {
  const deadline = Date.now() + 35_000;
  while (Date.now() < deadline) {
    if (await evaluate(predicate)) return;
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  throw new Error(`Tempo esgotado: ${label}`);
};

await command("Page.enable");
await command("Runtime.enable");
await command("Page.navigate", { url: targetUrl });
await waitFor("document.body.innerText.includes('20 paradas recebidas.')", "primeiro lote");
await evaluate("window.scrollTo(0, document.documentElement.scrollHeight)");
await waitFor("document.body.innerText.includes('40 paradas recebidas.')", "segundo lote visível");
console.log("OK: a lista pública exibiu 40 paradas após a rolagem contínua.");
socket.close();
