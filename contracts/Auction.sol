// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721Receiver.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title Auction (英式競價拍賣)
 * @notice 賣家拍賣一個 NFT，其他人用 MTK 競標，時間到「價高者得」。
 *         對應作業：HW2 全部（modifier/require/event/跨合約呼叫）、HW3 ERC-20、HW4 ERC-721
 *
 *  流程：
 *   1. 賣家 createAuction()：把 NFT 託管進本合約，設定起標價與結束時間
 *   2. 競標者 bid()：用 MTK 出價，必須高於目前最高價；被超越者的 MTK 自動退回
 *   3. 時間到後任何人 endAuction()：NFT 給最高出價者、MTK 給賣家（無人出價則退還 NFT）
 */
contract Auction is ReentrancyGuard, IERC721Receiver {
    IERC20 public immutable paymentToken; // 競標用代幣 (MTK)

    struct AuctionItem {
        uint256 id;
        address seller;
        address nft;
        uint256 tokenId;
        uint256 startPrice; // 起標價（MTK）
        uint256 endTime; // 結束時間（unix 秒）
        address highestBidder; // 目前最高出價者
        uint256 highestBid; // 目前最高出價
        bool settled; // 是否已結算
    }

    uint256 public nextAuctionId;
    mapping(uint256 => AuctionItem) public auctions;

    event AuctionCreated(
        uint256 indexed id,
        address indexed seller,
        address nft,
        uint256 tokenId,
        uint256 startPrice,
        uint256 endTime
    );
    event NewBid(uint256 indexed id, address indexed bidder, uint256 amount);
    event AuctionEnded(uint256 indexed id, address indexed winner, uint256 amount);

    constructor(address _paymentToken) {
        require(_paymentToken != address(0), "Auction: zero token address");
        paymentToken = IERC20(_paymentToken);
    }

    /**
     * @notice 賣家建立拍賣：把 NFT 託管進合約，設定起標價與時長。
     * @dev 需先 approve 本合約可轉移該 NFT；HW2 #6 跨合約呼叫 ERC-721。
     */
    function createAuction(
        address nft,
        uint256 tokenId,
        uint256 startPrice,
        uint256 durationSeconds
    ) external returns (uint256) {
        require(startPrice > 0, "Auction: startPrice must be > 0");
        require(durationSeconds >= 30, "Auction: duration too short (>=30s)");

        // 把 NFT 託管進本合約（賣家須先 approve）
        IERC721(nft).safeTransferFrom(msg.sender, address(this), tokenId);

        uint256 id = nextAuctionId;
        nextAuctionId++;
        uint256 endTime = block.timestamp + durationSeconds;
        auctions[id] = AuctionItem(id, msg.sender, nft, tokenId, startPrice, endTime, address(0), 0, false);

        emit AuctionCreated(id, msg.sender, nft, tokenId, startPrice, endTime);
        return id;
    }

    /**
     * @notice 用 MTK 出價。必須高於目前最高價（或 >= 起標價）。
     * @dev 被超越的前一位最高出價者，其 MTK 在此自動退回（HW2 #4 安全處理）。
     */
    function bid(uint256 id, uint256 amount) external nonReentrant {
        AuctionItem storage a = auctions[id];
        require(a.seller != address(0), "Auction: auction not found");
        require(block.timestamp < a.endTime, "Auction: already ended");
        require(msg.sender != a.seller, "Auction: seller cannot bid");

        uint256 minBid = a.highestBid == 0 ? a.startPrice : a.highestBid + 1;
        require(amount >= minBid, "Auction: bid not high enough");

        // 收取新出價（競標者須先 approve 本合約）
        require(paymentToken.transferFrom(msg.sender, address(this), amount), "Auction: MTK transfer failed");

        // 記錄前一位最高出價者，準備退款
        address prevBidder = a.highestBidder;
        uint256 prevBid = a.highestBid;

        // 先更新狀態（Checks-Effects-Interactions）
        a.highestBidder = msg.sender;
        a.highestBid = amount;

        // 退還前一位最高出價者的 MTK
        if (prevBidder != address(0)) {
            require(paymentToken.transfer(prevBidder, prevBid), "Auction: refund failed");
        }

        emit NewBid(id, msg.sender, amount);
    }

    /**
     * @notice 時間到後結算：價高者得 NFT、賣家收 MTK；無人出價則退還 NFT 給賣家。
     *         任何人都可呼叫（去信任化結算）。
     */
    function endAuction(uint256 id) external nonReentrant {
        AuctionItem storage a = auctions[id];
        require(a.seller != address(0), "Auction: auction not found");
        require(block.timestamp >= a.endTime, "Auction: not ended yet");
        require(!a.settled, "Auction: already settled");

        a.settled = true;

        if (a.highestBidder != address(0)) {
            // 得標者拿 NFT、賣家拿 MTK
            IERC721(a.nft).safeTransferFrom(address(this), a.highestBidder, a.tokenId);
            require(paymentToken.transfer(a.seller, a.highestBid), "Auction: pay seller failed");
            emit AuctionEnded(id, a.highestBidder, a.highestBid);
        } else {
            // 無人出價：退還 NFT 給賣家
            IERC721(a.nft).safeTransferFrom(address(this), a.seller, a.tokenId);
            emit AuctionEnded(id, address(0), 0);
        }
    }

    /// @notice 回傳所有尚未結算的拍賣（含進行中與待結算），給前端顯示。
    function getActiveAuctions() external view returns (AuctionItem[] memory) {
        uint256 count;
        for (uint256 i = 0; i < nextAuctionId; i++) {
            if (!auctions[i].settled) count++;
        }
        AuctionItem[] memory result = new AuctionItem[](count);
        uint256 j;
        for (uint256 i = 0; i < nextAuctionId; i++) {
            if (!auctions[i].settled) {
                result[j] = auctions[i];
                j++;
            }
        }
        return result;
    }

    /// 讓本合約能安全接收 ERC-721（託管 NFT 用）
    function onERC721Received(
        address,
        address,
        uint256,
        bytes calldata
    ) external pure override returns (bytes4) {
        return IERC721Receiver.onERC721Received.selector;
    }
}
