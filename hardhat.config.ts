import "dotenv/config";
import hardhatToolboxMochaEthersPlugin from "@nomicfoundation/hardhat-toolbox-mocha-ethers";
import { configVariable, defineConfig } from "hardhat/config";

// Hardhat 3 設定：plugins 陣列、network 需指定 type、secrets 用 configVariable
// （configVariable 會從 .env / keystore 讀取，部署到 Sepolia 時才需要）
export default defineConfig({
  plugins: [hardhatToolboxMochaEthersPlugin],
  solidity: {
    profiles: {
      default: {
        version: "0.8.28",
        settings: {
          optimizer: { enabled: true, runs: 200 },
          evmVersion: "cancun", // OpenZeppelin v5 需要；Sepolia 已支援
        },
      },
      production: {
        version: "0.8.28",
        settings: {
          optimizer: { enabled: true, runs: 200 },
          evmVersion: "cancun",
        },
      },
    },
  },
  networks: {
    // 本地模擬鏈（測試用，跑 npm test 時自動使用）
    hardhatMainnet: {
      type: "edr-simulated",
      chainType: "l1",
    },
    // 本地持久節點（npx hardhat node）：用其第 0 號公開測試帳號部署
    localhost: {
      type: "http",
      chainType: "l1",
      url: "http://127.0.0.1:8545",
      accounts: [
        "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80",
      ],
    },
    // Sepolia 測試網（正式上鏈用）
    sepolia: {
      type: "http",
      chainType: "l1",
      url: configVariable("SEPOLIA_RPC_URL"),
      accounts: [configVariable("SEPOLIA_PRIVATE_KEY")],
    },
  },
  // Etherscan 原始碼驗證（部署後讓合約在鏈上公開可讀）
  verify: {
    etherscan: {
      apiKey: configVariable("ETHERSCAN_API_KEY"),
    },
  },
});
