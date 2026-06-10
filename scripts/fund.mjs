// 從 .env 的賣家帳號轉一點 Sepolia ETH 給指定地址（給買家帳號當 gas）
// 用法： node scripts/fund.mjs <收款地址> [金額ETH，預設0.02]
import "dotenv/config";
import { ethers } from "ethers";

const to = process.argv[2];
const amount = process.argv[3] || "0.02";
if (!to) { console.error("請提供收款地址"); process.exit(1); }

const provider = new ethers.JsonRpcProvider(process.env.SEPOLIA_RPC_URL);
const wallet = new ethers.Wallet(process.env.SEPOLIA_PRIVATE_KEY, provider);

const dest = ethers.getAddress(to); // 會驗證 EIP-55 checksum，打錯字會直接報錯（安全網）
console.log(`從 ${wallet.address}`);
console.log(`轉 ${amount} ETH 給 ${dest} …`);

const tx = await wallet.sendTransaction({ to: dest, value: ethers.parseEther(amount) });
console.log("tx:", tx.hash);
await tx.wait();

console.log("✓ 完成");
console.log("  賣家剩餘:", ethers.formatEther(await provider.getBalance(wallet.address)), "ETH");
console.log("  買家餘額:", ethers.formatEther(await provider.getBalance(dest)), "ETH");
process.exit(0);
