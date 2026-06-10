# Web3 混合型商城（期末專題）

一個去中心化商城 DApp：使用者用平台代幣 **MTK (ERC-20)** 購買 **商品 NFT (ERC-721)**，
全程透過 **MetaMask** 簽名、部署在 **Sepolia 測試網**，所有交易、代幣與 NFT 皆可在 **Etherscan**
公開查詢（NFT 另可於 Etherscan 的 ERC-721 頁與 MetaMask 的 NFTs 分頁檢視）。
> 註：OpenSea 已於 2025/7 停止支援測試網，故 NFT 改以 Etherscan + MetaMask 驗證（與 HW4 相同做法）。

## 整合的課程作業

| 作業 | 用在哪 |
|---|---|
| HW1 | 部署到測試網、gas、Etherscan 查詢 |
| HW2 | constructor、modifier、繼承、require/revert、event、呼叫其他合約 |
| HW3 | MallToken（ERC-20 + OpenZeppelin + faucet）|
| HW4 | MallItem（ERC-721 + IPFS metadata）|
| HW5（加分）| Chainlink 價格預言機顯示 MTK 估值 |

## 合約架構

```
MallToken (ERC-20)   平台代幣 MTK，內建 faucet 領幣
MallItem  (ERC-721)  商品即 NFT，圖片/描述存 IPFS
Marketplace          上架、用 MTK 購買、取消（把代幣與 NFT 串起來）
```

## 專案結構

```
mall-dapp/
├─ contracts/             三個 Solidity 合約
├─ ignition/modules/      Ignition 宣告式部署模組 (Mall.ts)
├─ scripts/               export-frontend.mjs（把部署地址寫進前端）
├─ test/                  Hardhat 測試 (Mall.ts，8 passing)
├─ frontend/              GUI（單一 HTML + ethers.js，連接 MetaMask）
├─ hardhat.config.ts      Hardhat 3 設定
└─ tsconfig.json
```
> 技術棧：Hardhat 3 + Hardhat Ignition + TypeScript + OpenZeppelin v5（與 HW3/4/5 一致）

---

## 使用步驟

### 1. 安裝（已完成）
```bash
npm install
```

### 2. 本地測試合約
```bash
npm run compile
npm test          # 8 passing
```

### 3. 設定 .env（部署上鏈前）
複製 `.env.example` 成 `.env`，填入三個值（Hardhat 3 用 configVariable 讀取）：
- `SEPOLIA_RPC_URL`：Alchemy / Infura 的 Sepolia 節點網址
- `SEPOLIA_PRIVATE_KEY`：你的測試帳號私鑰（先去領 Sepolia 測試幣）
- `ETHERSCAN_API_KEY`：etherscan.io 免費申請

### 4. 部署到 Sepolia（Ignition）
```bash
npm run deploy:sepolia       # hardhat ignition deploy ... --network sepolia
npm run export               # 把合約地址寫進 frontend/config.js
```

### 5. 驗證原始碼（鏈上公開可讀 = 強力證明）
```bash
npm run verify:sepolia       # hardhat ignition verify chain-11155111
```

### 6. 開啟前端
用任何靜態伺服器開啟 `frontend/`（讓 MetaMask 正常注入）：
```bash
npx serve frontend
# 或用 VS Code 的 Live Server 開 frontend/index.html
```
然後：連接小狐狸 → 領 MTK → 上架商品 → 購買，每筆都有 Etherscan 連結可查。

### （選用）本地預覽：不花 Sepolia ETH 先試整套流程
```bash
npx hardhat node                              # 終端機 A：啟動本地鏈
npm run deploy:local                          # 終端機 B：部署到本地
node scripts/export-frontend.mjs 31337        # 把本地地址寫進前端
# MetaMask 新增 localhost:8545 (chainId 31337) 網路，匯入 hardhat node 的測試帳號即可試玩
```

---

## 上架商品的圖片（IPFS / Pinata）
1. 把圖片上傳到 [Pinata](https://pinata.cloud)，得到 `ipfs://<圖片CID>`
2. 把 `metadata-sample.json` 的 `image` 換成該 CID，再上傳這個 JSON，得到 `ipfs://<metadataCID>`
3. 在前端「商品 metadata 網址」填入 `ipfs://<metadataCID>` 即可
（demo 趕時間也可直接填一個圖片網址）
