// 從 Ignition 部署結果讀出合約地址，寫入 frontend/config.js
// 用法： node scripts/export-frontend.mjs [chainId]   例： node scripts/export-frontend.mjs 11155111
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const deployDir = path.join(root, "ignition", "deployments");

const wantChain = process.argv[2];
let chainFolder;
if (fs.existsSync(deployDir)) {
  const folders = fs.readdirSync(deployDir).filter((f) => f.startsWith("chain-"));
  // 優先序：argv 指定 > Sepolia(11155111) > 最後一個
  if (wantChain) chainFolder = folders.find((f) => f === `chain-${wantChain}`);
  if (!chainFolder) chainFolder = folders.find((f) => f === "chain-11155111");
  if (!chainFolder) chainFolder = folders[folders.length - 1];
}
if (!chainFolder) {
  console.error("✗ 找不到任何 Ignition 部署，請先執行 npm run deploy:sepolia");
  process.exit(1);
}

const chainId = Number(chainFolder.replace("chain-", ""));
const addrFile = path.join(deployDir, chainFolder, "deployed_addresses.json");
const addrs = JSON.parse(fs.readFileSync(addrFile, "utf8"));
const pick = (name) => addrs[`MallModule#${name}`] || "";

const contracts = {
  MallToken: pick("MallToken"),
  MallItem: pick("MallItem"),
  Marketplace: pick("Marketplace"),
  PriceConsumer: pick("PriceConsumer"),
  Auction: pick("Auction"),
};

const out =
  `// 由 scripts/export-frontend.mjs 從 Ignition 部署結果自動產生\n` +
  `window.MALL_CONFIG = ${JSON.stringify(
    { chainId, chainName: chainId === 11155111 ? "sepolia" : "local", contracts },
    null,
    2
  )};\n`;

fs.writeFileSync(path.join(root, "frontend", "config.js"), out);
console.log(`✅ 已從 ${chainFolder} 更新 frontend/config.js`);
console.log(contracts);
