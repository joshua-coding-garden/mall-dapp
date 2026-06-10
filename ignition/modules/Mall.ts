import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

// Chainlink Sepolia ETH/USD Data Feed (HW5)
const SEPOLIA_ETH_USD_FEED = "0x694AA1769357215DE4FAC081bf1f309aDC325306";

/**
 * Ignition 宣告式部署模組：一次部署四個合約並處理依賴。
 *   - MallToken / MallItem 無建構子參數
 *   - Marketplace 需要付款代幣位址 → Ignition 自動把 token 位址傳入
 *   - PriceConsumer 需要 Chainlink Aggregator 位址（Sepolia ETH/USD）
 */
export default buildModule("MallModule", (m) => {
  const token = m.contract("MallToken");
  const item = m.contract("MallItem");
  const marketplace = m.contract("Marketplace", [token]);
  const priceConsumer = m.contract("PriceConsumer", [SEPOLIA_ETH_USD_FEED]);
  const auction = m.contract("Auction", [token]); // 英式競價拍賣，用 MTK 競標

  return { token, item, marketplace, priceConsumer, auction };
});
