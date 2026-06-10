// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {AggregatorV3Interface} from "@chainlink/contracts/src/v0.8/shared/interfaces/AggregatorV3Interface.sol";

/**
 * @title PriceConsumer
 * @notice Chainlink Data Feeds 消費端：讀取鏈上 ETH/USD 即時聚合價格。
 *         對應作業：HW5(Chainlink Oracles - Data Feeds)
 *
 *  區塊鏈合約無法主動取得鏈外資料（Oracle 問題）。Chainlink 透過去中心化
 *  預言機網路把聚合後的價格寫入鏈上 Aggregator，合約只需呼叫標準介面讀取。
 *  本商城用它把 MTK 售價換算成參考美金價，展示與真實世界資料的互動。
 *
 *  Sepolia ETH/USD Aggregator: 0x694AA1769357215DE4FAC081bf1f309aDC325306
 */
contract PriceConsumer {
    AggregatorV3Interface public immutable priceFeed;

    /// @param feed Chainlink Aggregator 合約地址（Sepolia ETH/USD）
    constructor(address feed) {
        priceFeed = AggregatorV3Interface(feed);
    }

    /// @notice 回傳最新一輪的 ETH/USD 原始價格（需除以 10**decimals 得實際美金）。
    function getLatestPrice() external view returns (int256) {
        (, int256 price, , , ) = priceFeed.latestRoundData();
        return price;
    }

    /// @notice Aggregator 的小數位數（Sepolia ETH/USD 為 8）。
    function getDecimals() external view returns (uint8) {
        return priceFeed.decimals();
    }
}
