// 部署前預檢：確認 .env 的 RPC / 私鑰 / 餘額正常（不會印出私鑰）
import "dotenv/config";
import { ethers } from "ethers";

const url = process.env.SEPOLIA_RPC_URL;
const pk = process.env.SEPOLIA_PRIVATE_KEY;

if (!url || !pk) {
  console.error("✗ .env 缺少 SEPOLIA_RPC_URL 或 SEPOLIA_PRIVATE_KEY");
  process.exit(1);
}

const provider = new ethers.JsonRpcProvider(url);
const net = await provider.getNetwork();
const wallet = new ethers.Wallet(pk, provider);
const bal = await provider.getBalance(wallet.address);
const balEth = Number(ethers.formatEther(bal));

console.log("chainId   :", Number(net.chainId), Number(net.chainId) === 11155111 ? "(Sepolia ✓)" : "(⚠ 不是 Sepolia)");
console.log("部署帳號  :", wallet.address);
console.log("餘額      :", balEth, "ETH", balEth >= 0.01 ? "(足夠部署 ✓)" : "(⚠ 可能不夠，建議 ≥0.01)");
