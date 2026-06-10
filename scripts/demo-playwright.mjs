// Playwright auto-demo: connect wallet -> claim MTK -> list NFT
// Headless wallet injected; signing done by Node-side key (key never enters browser)
import "dotenv/config";
import http from "http";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { ethers } from "ethers";
import { chromium } from "playwright";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const FE = path.join(__dirname, "..", "frontend");
const SHOTS = path.join(__dirname, "..", "_demo_shots");
fs.mkdirSync(SHOTS, { recursive: true });

const TYPES = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".json": "application/json" };
const server = http.createServer((req, res) => {
  let p = decodeURIComponent(req.url.split("?")[0]);
  if (p === "/") p = "/index.html";
  const fp = path.join(FE, p);
  if (!fp.startsWith(FE) || !fs.existsSync(fp)) { res.writeHead(404); res.end("404"); return; }
  res.writeHead(200, { "content-type": TYPES[path.extname(fp)] || "application/octet-stream" });
  fs.createReadStream(fp).pipe(res);
});
await new Promise((r) => server.listen(0, r));
const PORT = server.address().port;
const URL = "http://127.0.0.1:" + PORT + "/index.html";
console.log("server on", PORT);

const provider = new ethers.JsonRpcProvider(process.env.SEPOLIA_RPC_URL);
const wallet = new ethers.Wallet(process.env.SEPOLIA_PRIVATE_KEY, provider);
console.log("demo account:", wallet.address);

const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
const page = await ctx.newPage();
page.on("console", (m) => console.log("  [page]", m.text()));
page.on("pageerror", (e) => console.log("  [pageerror]", e.message));

await page.exposeFunction("nodeAddr", async () => wallet.address);
await page.exposeFunction("nodeRpc", async (method, params) => provider.send(method, params || []));
await page.exposeFunction("nodeSend", async (tx) => {
  const sent = await wallet.sendTransaction({ to: tx.to, data: tx.data, value: tx.value ?? undefined });
  console.log("  tx sent:", sent.hash);
  return sent.hash;
});

await page.addInitScript(() => {
  const noop = () => {};
  window.ethereum = {
    isMetaMask: true,
    request: async ({ method, params }) => {
      if (method === "eth_requestAccounts" || method === "eth_accounts") return [await window.nodeAddr()];
      if (method === "eth_chainId") return "0xaa36a7";
      if (method === "net_version") return "11155111";
      if (method === "wallet_switchEthereumChain" || method === "wallet_addEthereumChain") return null;
      if (method === "eth_sendTransaction") return await window.nodeSend(params[0]);
      return await window.nodeRpc(method, params || []);
    },
    on: noop, removeListener: noop, removeAllListeners: noop,
  };
});

const shot = async (name) => { await page.screenshot({ path: path.join(SHOTS, name), fullPage: true }); console.log("shot:", name); };

try {
await page.goto(URL, { waitUntil: "load" });
await page.waitForTimeout(1500);
await shot("s1-initial.png");

console.log("step1: connect wallet");
await page.click("#connectBtn");
await page.waitForFunction(() => document.querySelector("#account")?.textContent?.startsWith("0x"), undefined, { timeout: 60000 });
await page.waitForTimeout(4000);
await shot("s2-connected.png");

console.log("step2: claim 1000 MTK (skip if already funded)");
const bal0 = await page.evaluate(() => Number((document.querySelector("#mtkBal")?.textContent || "0").replace(/,/g, "")));
if (bal0 < 1000) {
  await page.click("#claimBtn");
  await page.waitForFunction(
    () => Number((document.querySelector("#mtkBal")?.textContent || "0").replace(/,/g, "")) >= 1000,
    undefined, { timeout: 150000 }
  );
} else {
  console.log("  already has", bal0, "MTK, skip claim");
}
await page.waitForTimeout(1500);
await shot("s3-claimed.png");

console.log("step3: list an NFT item (mint + approve + list)");
await page.fill("#sellUri", "https://picsum.photos/seed/mallnft/500");
await page.fill("#sellPrice", "100");
await page.click("#listBtn");
await page.waitForFunction(() => document.querySelectorAll("#items .item").length >= 1, undefined, { timeout: 240000 });
await page.waitForTimeout(3000);
await shot("s4-listed.png");

console.log("DEMO DONE");
} catch (e) {
  console.log("DEMO ERROR:", e.message);
  try { await shot("s9-error.png"); } catch (_) {}
} finally {
  await browser.close();
  server.close();
  process.exit(0);
}
